import os
import json
import re
import chromadb
from typing import Dict, Any, List
from sentence_transformers import SentenceTransformer
from google.adk import Workflow, Runner, Context
from google.adk.sessions import InMemorySessionService
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()

# Initialize ChromaDB client and Embedding model
print("Initializing ChromaDB connection...")
chroma_client = chromadb.PersistentClient(path="./chromadb_store")
try:
    collection = chroma_client.get_collection(name="kathagemma_corpus")
    print("Loading SentenceTransformer weights...")
    embed_model = SentenceTransformer("all-MiniLM-L6-v2")
    # Force immediate loading to prevent background tqdm output pollution
    embed_model.encode(["init"])
    RAG_AVAILABLE = True
except Exception as e:
    print(f"ChromaDB collection not found: {e}. Running without active RAG.")
    RAG_AVAILABLE = False

# Initialize Gemini Model for active JSON compiling & translator fallback
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
ACTIVE_MODE = GEMINI_API_KEY is not None

# Local LoRA adapter inference configurations
USE_LOCAL_LORA = os.environ.get("USE_LOCAL_LORA") == "1" or os.path.exists(
    "./kathagemma_lora_weights"
)
base_model = None
local_lora_model = None
local_lora_tokenizer = None

if USE_LOCAL_LORA:
    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
        from peft import PeftModel

        print(
            "USE_LOCAL_LORA is enabled. Loading local fine-tuned LoRA adapter from ./kathagemma_lora_weights..."
        )
        # Load base model
        base_model = AutoModelForCausalLM.from_pretrained(
            "google/gemma-4-E2B-it",
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto" if torch.cuda.is_available() else None,
            low_cpu_mem_usage=True,
        )
        # Load LoRA adapter
        local_lora_model = PeftModel.from_pretrained(
            base_model, "./kathagemma_lora_weights", strict=False
        )
        local_lora_tokenizer = AutoTokenizer.from_pretrained("google/gemma-4-E2B-it")
        print("Local fine-tuned LoRA model loaded successfully!")
    except Exception as e:
        print(f"Failed to load local LoRA model: {e}. Falling back to standard modes.")
        USE_LOCAL_LORA = False

if ACTIVE_MODE and not USE_LOCAL_LORA:
    print("Gemini API Key detected. Active Mode is enabled.")
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=GEMINI_API_KEY,
        model_kwargs={"response_mime_type": "application/json"},
    )
else:
    if not USE_LOCAL_LORA:
        print("No Gemini API Key detected. Running in Simulation Mode.")
    llm = None


# Load system instructions
def load_system_instructions():
    filepath = "system_instructions.md"
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            return f.read()
    return "You are KathaGemma, a patient tutoring voice-first assistant. Output JSON only."


SYSTEM_INSTRUCTIONS = load_system_instructions()

# --- MULTILINGUAL TRANSLATION SERVICE (INDIAN LANGUAGES) ---

# Static translation mapping for common early education child nouns, animals, colors, and verbs
MULTILINGUAL_DICTIONARY = {
    # Animals
    "biral": "cat",
    "billi": "cat",
    "pilli": "cat",
    "poonai": "cat",
    "manjar": "cat",  # Ben, Hin, Tel, Tam, Mar
    "shukah": "parrot",
    "tota": "parrot",
    "chiluka": "parrot",
    "kili": "parrot",
    "popat": "parrot",
    "hathi": "elephant",
    "enugu": "elephant",
    "yanai": "elephant",
    "gaja": "elephant",
    # Colors
    "lal": "red",
    "kempu": "red",
    "sivappu": "red",
    "tambda": "red",
    "surkh": "red",  # Ben/Hin, Tel, Tam, Mar, Urd
    "sabuj": "green",
    "hara": "green",
    "pacha": "green",
    "pasumai": "green",
    "hirva": "green",
    # Common Nouns & Verbs
    "gas": "tree",
    "ped": "tree",
    "chettu": "tree",
    "maram": "tree",
    "jhad": "tree",
    "balloon": "balloon",
    "gubbara": "balloon",
    "ubbara": "balloon",
    "mithai": "sweet",
    "mishti": "sweet",
    "teepi": "sweet",
    "inippu": "sweet",
    "ure": "flew",
    "ud": "flew",
    "egiri": "flew",
    "para": "flew",
}


def generate_with_gemma(prompt: str, max_tokens: int = 256, use_lora: bool = False) -> str:
    """Runs text generation directly on the local base Gemma model or LoRA fine-tuned model."""
    target_model = local_lora_model if use_lora else base_model
    if USE_LOCAL_LORA and target_model and local_lora_tokenizer:
        try:
            import torch

            device = next(target_model.parameters()).device
            messages = [{"role": "user", "content": prompt}]
            inputs = local_lora_tokenizer.apply_chat_template(
                messages,
                return_dict=True,
                return_tensors="pt",
                add_generation_prompt=True,
            ).to(device)
            with torch.no_grad():
                outputs = target_model.generate(
                    **inputs,
                    max_new_tokens=max_tokens,
                    temperature=0.7,
                    top_p=0.95,
                    do_sample=True,
                )
            raw_text = local_lora_tokenizer.decode(
                outputs[0][inputs["input_ids"].shape[1] :], skip_special_tokens=True
            ).strip()
            return raw_text
        except Exception as e:
            print(f"Local Gemma generation error (lora={use_lora}): {e}")
    return ""


def generate_with_gemma_or_fallback(prompt: str, max_tokens: int = 256, use_lora: bool = False) -> str:
    """Core reasoning gateway: routes to local Gemma first, falling back to Gemini if offline mode is disabled."""
    print(
        f"\n[ORCHESTRATOR DETAILED LOG] Prompt sent to reasoning engine (lora={use_lora}):\n{prompt.strip()}\n"
    )
    res = generate_with_gemma(prompt, max_tokens, use_lora)
    if res:
        model_name = "LOCAL LORA ADAPTER" if use_lora else "LOCAL BASE GEMMA MODEL"
        print(
            f"[ORCHESTRATOR DETAILED LOG] Response generated by {model_name}:\n{res}\n"
        )
        return res

    if ACTIVE_MODE and llm:
        print(
            "[ORCHESTRATOR DETAILED LOG] Local model inactive/failed. Falling back to Gemini."
        )
        try:
            response = llm.invoke([HumanMessage(content=prompt)])
            out_content = response.content.strip()
            print(
                f"[ORCHESTRATOR DETAILED LOG] Response generated by GEMINI BACKUP:\n{out_content}\n"
            )
            return out_content
        except Exception as e:
            print(f"[ORCHESTRATOR DETAILED LOG] Gemini Backup failed: {e}")

    print("[ORCHESTRATOR DETAILED LOG] No active models available for prompt.")
    return ""


def translate_multilingual_chatter(
    text: str, language_framework: str = "English"
) -> str:
    """
    Translates code-switched Indian languages chatter (Bengali, Hindi, Telugu, Tamil, Marathi, etc.)
    into English tags using static lookup and a dynamic Gemini translator fallback.
    """
    text_lower = text.strip()
    if not text_lower:
        return ""

    # Differentiate telemetry markers (bracket inputs)
    if text_lower.startswith("[") and text_lower.endswith("]"):
        return text_lower

    # 1. Static Dictionary Translation Pass
    normalized_tokens = []
    words = re.findall(r"\b\w+\b", text_lower.lower())
    translated_any = False

    for word in words:
        if word in MULTILINGUAL_DICTIONARY:
            eng_val = MULTILINGUAL_DICTIONARY[word]
            normalized_tokens.append(f"{word} ({eng_val})")
            translated_any = True
        else:
            normalized_tokens.append(word)

    normalized_text = " ".join(normalized_tokens)

    # 2. Dynamic LLM Translator Fallback for out-of-vocabulary code-switched sentences
    if not translated_any:
        print(
            f"OOV Code-Switch Detected. Running dynamic translation query on: '{text_lower}'"
        )
        translation_prompt = f"""
        You are a multilingual child speech translator.
        Translate this code-switched or regional Indian language child response to plain English.
        Detect words from languages like Bengali, Hindi, Telugu, Tamil, Marathi, Urdu, Kannada, Malayalam, etc.
        Return a JSON structure: {{"translated_text": "plain English translation", "detected_language": "language name"}}
        Input child response: "{text_lower}"
        """
        try:
            resp_content = generate_with_gemma_or_fallback(
                translation_prompt, max_tokens=150
            )
            if "```json" in resp_content:
                resp_content = resp_content.split("```json")[1].split("```")[0].strip()
            elif resp_content.startswith("```"):
                resp_content = resp_content.split("```")[1].split("```")[0].strip()
            parsed = json.loads(resp_content.strip())
            translated_text = parsed.get("translated_text", text_lower)
            lang = parsed.get("detected_language", "unknown")
            print(
                f"Dynamic Translator: Detected {lang} -> Translated: '{translated_text}'"
            )
            return f"{text_lower} ({translated_text})"
        except Exception as e:
            print(f"Dynamic Translator failed: {e}")

    return normalized_text


# --- GOOGLE ADK GRAPH NODES ---


def sensory_interpreter_node(context: Context) -> str:
    """
    Node: Sensory Interpreter.
    Captures child inputs, isolates telemetry vs speech, and parses multilingual vocabularies.
    """
    user_input = context.state.get("user_input", "")
    vision_input = context.state.get("vision_input", "")

    # Fetch active language framework from child profile
    lang_framework = context.state.get("language_framework", "English")

    # Normalize inputs using translation service
    normalized_user_input = translate_multilingual_chatter(user_input, lang_framework)

    # Save back to context state
    context.state["user_input"] = normalized_user_input
    context.state["vision_input"] = vision_input

    print(f"Node: Sensory Interpreter -> Normalized Input: '{normalized_user_input}'")
    return "ok"


def attention_tracker_node(context: Context) -> str:
    """
    Node: Attention Tracker.
    Evaluates child profiles and decides active routing branches.
    """
    user_input = context.state.get("user_input", "").lower()
    consec_distractions = context.state.get("consecutive_distractions", 0)

    # Read child profile from state
    child_name = context.state.get("child_name", "Aarav")
    difficulty_profile = context.state.get(
        "difficulty_profile", "standard"
    )  # standard, ADHD, mild

    print(
        f"Node: Attention Tracker -> Active Child Profile: Name: {child_name}, Difficulty: {difficulty_profile}"
    )

    # Telemetry check (enclosed in brackets)
    is_sensor_trigger = user_input.startswith("[") and user_input.endswith("]")

    # Classify state
    attention_state = "focused"
    if (
        is_sensor_trigger
        or not user_input
        or "silent" in user_input
        or "look_away" in user_input
        or "look away" in user_input
    ):
        attention_state = "distracted"
        consec_distractions += 1
    else:
        # Dynamic semantic classification using local model
        classification_prompt = f"""
        Analyze this child's input during a storytelling session: "{user_input}"
        Determine if the child is distracted (talking about unrelated toys, games, TV, play, or other topics instead of answering or continuing the story) or focused (interested, answering, or asking about the story).
        Answer with a single word: "distracted" or "focused".
        """
        res = (
            generate_with_gemma_or_fallback(classification_prompt, max_tokens=10)
            .lower()
            .strip()
        )

        tired_prompt = f"""
        Analyze this child's input during a storytelling session: "{user_input}"
        Determine if the child is tired, sleepy, crying, or wanting to stop reading and rest.
        Answer with a single word: "tired" or "active".
        """
        res_tired = (
            generate_with_gemma_or_fallback(tired_prompt, max_tokens=10).lower().strip()
        )

        if "tired" in res_tired:
            attention_state = "tired"
            consec_distractions = 0
        elif "distracted" in res:
            attention_state = "distracted"
            consec_distractions += 1
        else:
            attention_state = "focused"
            consec_distractions = 0

    context.state["attention_state"] = attention_state
    context.state["consecutive_distractions"] = consec_distractions

    print(
        f"Node: Attention Tracker -> Attention: {attention_state} (Consecutive: {consec_distractions})"
    )

    # Perform conditional routing in Google ADK
    if attention_state == "distracted":
        context.route = "recovery"
        return "recovery"
    elif attention_state == "tired":
        context.route = "calming"
        return "calming"
    else:
        context.route = "storytelling"
        return "storytelling"


def storytelling_node(context: Context) -> dict:
    """
    Node: Storytelling RAG Branch.
    Retrieves graded child passages from ChromaDB.
    """
    story_index = context.state.get("story_index", 0)
    user_input = context.state.get("user_input", "")
    child_name = context.state.get("child_name", "Aarav")
    lang_framework = context.state.get("language_framework", "English")

    retrieved_text = ""
    illustration_path = "None"
    source_info = "Local Database"

    if RAG_AVAILABLE:
        try:
            # RAG query matching the input
            query_embedding = embed_model.encode([user_input or "story"]).tolist()

            # Dynamic book selection: check if current_story is not yet initialized in context
            current_story = context.state.get("current_story")
            if (
                not current_story
                or current_story == "None"
                or current_story == "Mithai"
            ):
                # Find the most matching book from search corpus
                results = collection.query(
                    query_embeddings=query_embedding, n_results=1
                )
                if results and results["metadatas"] and results["metadatas"][0]:
                    current_story = results["metadatas"][0][0].get(
                        "book_title", "Mithai"
                    )
                    context.state["current_story"] = current_story
                    print(
                        f"Dynamic RAG Selection -> Matched story book: '{current_story}' based on query: '{user_input}'"
                    )

            if not current_story:
                current_story = "Mithai"
                context.state["current_story"] = "Mithai"

            results = None
            try:
                # Filter search to current book to prevent cross-story content leak
                results = collection.query(
                    query_embeddings=query_embedding,
                    where={"book_title": current_story},
                    n_results=1,
                )
            except Exception:
                pass

            if not results or not results["documents"] or not results["documents"][0]:
                results = collection.query(
                    query_embeddings=query_embedding, n_results=1
                )
            if results and results["documents"] and results["documents"][0]:
                retrieved_text = results["documents"][0][0]
                meta = results["metadatas"][0][0]
                illustration_path = meta.get("illustration_image", "None")
                source_info = (
                    f"{meta.get('source', 'RAG')} - {meta.get('book_title', 'Story')}"
                )
                print(
                    f"RAG Retrieval -> Grounded: '{source_info}' | Illustration: '{illustration_path}'"
                )
        except Exception as e:
            print(f"RAG retrieval error: {e}")

    if not retrieved_text:
        # Fallback story
        default_stories = [
            "Mithai was a sweet shop owner. He made tasty round laddoos every morning.",
            "One sunny day, a little monkey came to the shop. It saw the laddoos and wanted one.",
            "Mimi was holding a lal balloon. Suddenly the balloon flew away past the trees.",
            "The parrot was sitting on the mango tree branch, eating a yellow sweet fruit.",
        ]
        retrieved_text = default_stories[story_index % len(default_stories)]
        source_info = "Default Story Board"

    # Dynamically structure the storytelling speech with child name and language framework using local Gemma model
    prompt = f"""
    You are a friendly child story narrator.
    Adapt the following story segment to a simple, engaging {lang_framework} narrative style for a child named {child_name}.
    Guidelines:
    - Keep it simple, clear, and age-appropriate (5-7 years old).
    - If the language is Hinglish: Blend Hindi conversational words and phrases naturally into the English sentences (e.g. Dekho, kitna tasty sweet laddoo! instead of Look, such a tasty sweet laddoo!).
    - If the language is Benglish: Blend Bengali conversational words and phrases naturally (e.g. Dekho, kemon shundor khabar! instead of Look, what a beautiful food!).
    - If the language is English: Use pure English.
    - Ground the response in this exact story text: "{retrieved_text}"
    Output ONLY the adapted story narrative text segment, nothing else. Do not add markdown boxes or titles.
    """

    narrative = generate_with_gemma_or_fallback(prompt, max_tokens=250)
    if not narrative or len(narrative.strip()) < 10:
        # Fallback to simple formatting if model fails
        if "benglish" in lang_framework.lower():
            narrative = f"Look, {child_name}! {retrieved_text} Oh! What a beautiful bird is there! Can you see it?"
        elif "hinglish" in lang_framework.lower():
            narrative = f"Look, {child_name}! {retrieved_text} Dekho, kitna tasty sweet laddoo hai! Can you see it?"
        else:
            narrative = (
                f"Wow, {child_name}! {retrieved_text} What do you think happens next?"
            )

    # Update state variables
    context.state["recommended_text"] = narrative
    context.state["ui_action"] = "PLAY_TTS"
    context.state["ui_params"] = {
        "source": source_info,
        "illustration_image": illustration_path,
    }
    context.state["expected_input"] = "speech"
    context.state["pedagogical_state"] = "storytelling"
    context.state["story_index"] = story_index + 1

    print(f"Storytelling narration: {narrative}")

    return {"status": "storytelling_complete"}


def active_recovery_node(context: Context) -> dict:
    """
    Node: Active Recovery Branch.
    Designs tactile and sensory recovery quests.
    """
    consec_distractions = context.state.get("consecutive_distractions", 1)
    child_name = context.state.get("child_name", "Aarav")
    difficulty_profile = context.state.get("difficulty_profile", "standard")
    current_story = context.state.get("current_story", "Mithai")

    # ADHD child triggers recovery quests faster
    if difficulty_profile == "ADHD":
        verbal_nudge_prefix = f"Hey {child_name}! Let's do something fun! "
    else:
        verbal_nudge_prefix = f"Hey {child_name}, let's play a small game together. "

    if consec_distractions % 2 == 1:
        # Camera Quest
        prompt = f"""
        You are a friendly child tutor. The child named {child_name} is reading the story "{current_story}" but has become distracted.
        Create an active recovery camera quest asking them to find a physical object (e.g. a leaf, toy, flower, crayon) related to the story context (e.g. if the story is "Mithai", ask them to find something sweet or green like a leaf, or if it is space, something round) and show it to the camera.
        Output ONLY a short, friendly instruction (1-2 sentences max). Do not mention JSON or coding terms.
        """
        recovery_quest = generate_with_gemma_or_fallback(prompt, max_tokens=150)
        if not recovery_quest:
            recovery_quest = "Find a green object in your room, like a leaf or toy, and show it to my camera! Let's help Raju cross the grass!"

        narrative = verbal_nudge_prefix + recovery_quest
        ui_action = "TRIGGER_CAMERA"
        ui_params = {"target_prompt": "Find something green"}
        expected_input = "image"

        print(f"Camera Quest: {narrative}")
    else:
        # Canvas whiteboard Quest
        prompt = f"""
        You are a friendly child tutor. The child named {child_name} is reading the story "{current_story}" but has become distracted.
        Create a fun recovery drawing quest asking them to draw a simple object (e.g. a sun, balloon, apple, smiley face) related to the story context on the screen whiteboard using their finger.
        Output ONLY a short, friendly instruction (1-2 sentences max). Do not mention JSON or coding terms.
        """
        recovery_quest = generate_with_gemma_or_fallback(prompt, max_tokens=150)
        if not recovery_quest:
            recovery_quest = (
                "Use your finger to draw a round yellow sun on the screen whiteboard!"
            )

        narrative = verbal_nudge_prefix + recovery_quest
        ui_action = "SHOW_CANVAS"
        ui_params = {"target_prompt": "Draw a yellow sun"}
        expected_input = "canvas"

        print(f"Canvas Quest: {narrative}")

    context.state["recommended_text"] = narrative
    context.state["ui_action"] = ui_action
    context.state["ui_params"] = ui_params
    context.state["expected_input"] = expected_input
    context.state["pedagogical_state"] = "distraction_recovery"

    return {"status": "recovery_complete"}


def calming_node(context: Context) -> dict:
    """
    Node: Calming Branch.
    Triggered when the child is fatigued or overstimulated.
    """
    child_name = context.state.get("child_name", "Aarav")
    current_story = context.state.get("current_story", "Mithai")

    prompt = f"""
    You are a gentle child tutor. The child named {child_name} is tired, sleepy, or crying during the story "{current_story}".
    Create a comforting, soothing message (1-2 sentences) suggesting a calming option (like listening to a soft lullaby, hearing a funny riddle, or taking a slow deep breath).
    Output ONLY the short comforting message. Do not mention JSON or coding terms.
    """
    calming_dialog = generate_with_gemma_or_fallback(prompt, max_tokens=150)
    if not calming_dialog:
        calming_dialog = f"Oh, {child_name}! You look a bit tired. Let's take a slow, deep breath. Sshhh... Would you like me to sing a soft lullaby or tell a funny riddle?"

    context.state["recommended_text"] = calming_dialog
    context.state["ui_action"] = "SHOW_CHOICES"
    context.state["ui_params"] = {"choices": ["Sing a Lullaby", "Tell a Riddle"]}
    context.state["expected_input"] = "touch"
    context.state["pedagogical_state"] = "distraction_recovery"

    print(f"Calming dialogue: {calming_dialog}")

    return {"status": "calming_complete"}


def json_orchestrator_node(context: Context) -> dict:
    """
    Node: JSON State Orchestrator.
    Converts and compiles the aggregated state decisions into a valid JSON layout.
    """
    recommended_text = context.state.get("recommended_text", "")
    ui_action = context.state.get("ui_action", "PLAY_TTS")
    ui_params = context.state.get("ui_params", {})
    expected_input = context.state.get("expected_input", "speech")
    pedagogical_state = context.state.get("pedagogical_state", "storytelling")

    final_json = None

    # 1. Local Fine-tuned LoRA inference compile pass
    if USE_LOCAL_LORA and local_lora_model and local_lora_tokenizer:
        prompt = f"""
        Compile these variables into the structured tutoring JSON framework:
        narrative: "{recommended_text}"
        action: "{ui_action}"
        params: {json.dumps(ui_params)}
        pedagogy: "{pedagogical_state}"
        input: "{expected_input}"
        """
        try:
            raw_text = generate_with_gemma(prompt, max_tokens=256, use_lora=True)
            print(
                f"\n[ORCHESTRATOR DETAILED LOG] Local LoRA Model Raw Output:\n{raw_text}\n"
            )
            # Clean formatting blocks
            if raw_text.startswith("```json"):
                raw_text = raw_text.split("```json")[1].split("```")[0].strip()
            elif raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1].split("```")[0].strip()
            final_json = json.loads(raw_text)
            print(
                "[ORCHESTRATOR DETAILED LOG] Successfully parsed local LoRA output JSON!"
            )
        except Exception as e:
            import traceback

            traceback.print_exc()
            print(f"Local LoRA compiler block failed: {e}. Falling back.")

    # 2. Active Gemini compile pass
    if not final_json and ACTIVE_MODE and llm:
        # Note: If the base model is fine-tuned, this prompt simplifies massively
        # as the model's adapter weights natively output this structure without heavy rules instructions.
        prompt = f"""
        Compile these variables into the structured tutoring JSON framework:
        narrative: "{recommended_text}"
        action: "{ui_action}"
        params: {json.dumps(ui_params)}
        pedagogy: "{pedagogical_state}"
        input: "{expected_input}"
        """
        try:
            response = llm.invoke(
                [
                    SystemMessage(
                        content="You are a JSON compiler outputting the schema exactly."
                    ),
                    HumanMessage(content=prompt),
                ]
            )
            raw_text = response.content.strip()
            print(
                f"\n[ORCHESTRATOR DETAILED LOG] Gemini Compiler Raw Output:\n{raw_text}\n"
            )
            # Clean formatting blocks
            if raw_text.startswith("```json"):
                raw_text = raw_text.split("```json")[1].split("```")[0].strip()
            elif raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1].split("```")[0].strip()
            final_json = json.loads(raw_text)
            print(
                "[ORCHESTRATOR DETAILED LOG] Successfully parsed Gemini compile JSON!"
            )
        except Exception as e:
            print(f"Gemini compiler block failed: {e}. Running fallback formatter.")

    # 2. Local Fallback Compiler
    if not final_json:
        final_json = {
            "spoken_text": recommended_text,
            "ui_action": ui_action,
            "ui_params": ui_params,
            "pedagogical_state": pedagogical_state,
            "expected_input": expected_input,
        }

    # Schema validation
    required_keys = [
        "spoken_text",
        "ui_action",
        "ui_params",
        "pedagogical_state",
        "expected_input",
    ]
    for key in required_keys:
        if key not in final_json:
            if key == "spoken_text":
                final_json["spoken_text"] = recommended_text
            elif key == "ui_action":
                final_json["ui_action"] = ui_action
            elif key == "ui_params":
                final_json["ui_params"] = ui_params
            elif key == "pedagogical_state":
                final_json["pedagogical_state"] = pedagogical_state
            elif key == "expected_input":
                final_json["expected_input"] = expected_input

    # UI interaction note: 'expected_input' is the key UI uses to configure sensor capture
    context.state["final_response_json"] = final_json
    print("Node: JSON Orchestrator -> Final JSON compiled and validated.")
    return {"response": final_json}


# --- GOOGLE ADK WORKFLOW TOPOLOGY ---

workflow = Workflow(
    name="kathagemma_adk_workflow",
    edges=[
        ("START", sensory_interpreter_node),
        (sensory_interpreter_node, attention_tracker_node),
        (
            attention_tracker_node,
            {
                "storytelling": storytelling_node,
                "recovery": active_recovery_node,
                "calming": calming_node,
            },
        ),
        (storytelling_node, json_orchestrator_node),
        (active_recovery_node, json_orchestrator_node),
        (calming_node, json_orchestrator_node),
    ],
)

# Compile ADK Runner instance
session_service = InMemorySessionService()
runner = Runner(
    app_name="kathagemma_app",
    agent=workflow,
    session_service=session_service,
    auto_create_session=True,
)


def run_adk_orchestration(
    user_input: str,
    vision_input: str = "",
    session_id: str = "s1",
    user_id: str = "child_1",
    child_profile: Dict[str, Any] = None,
) -> Dict[str, Any]:
    """
    Runs a single step of the Google ADK multi-agent graph, applying profile variables.
    """
    import asyncio

    # Initialize child profile defaults
    if child_profile is None:
        child_profile = {
            "child_name": "Aarav",
            "age": 5,
            "difficulty_profile": "standard",
            "language_framework": "English",
        }

    # Check if session exists, else create it
    try:
        session = asyncio.run(
            runner.session_service.get_session(
                app_name="kathagemma_app", session_id=session_id, user_id=user_id
            )
        )
    except Exception:
        session = None

    if session is None:
        # Create fresh session state
        initial_state = {"story_index": 0, "consecutive_distractions": 0, "history": []}
        initial_state.update(child_profile)
        asyncio.run(
            runner.session_service.create_session(
                app_name="kathagemma_app",
                session_id=session_id,
                user_id=user_id,
                state=initial_state,
            )
        )
        session = asyncio.run(
            runner.session_service.get_session(
                app_name="kathagemma_app", session_id=session_id, user_id=user_id
            )
        )

    # Manually update state in the session object before running, committing it to session database
    session.state["user_input"] = user_input
    session.state["vision_input"] = vision_input
    for k, v in child_profile.items():
        session.state[k] = v
    runner.session_service.sessions["kathagemma_app"][user_id][session_id] = session

    # Execute step
    res_gen = runner.run(user_id=user_id, session_id=session_id, new_message=None)

    # Consume runner execution stream
    for event in res_gen:
        pass

    # Fetch final state and response
    updated_session = asyncio.run(
        runner.session_service.get_session(
            app_name="kathagemma_app", session_id=session_id, user_id=user_id
        )
    )

    response = updated_session.state.get("final_response_json", {})

    # Return updated session dictionary alongside the JSON response
    return {"state": updated_session.state, "response": response}


if __name__ == "__main__":
    # Test execution
    print("\n--- Running ADK Orchestrator Self-Test (Benglish Child) ---")
    res = run_adk_orchestration(
        user_input="Look at the Biral",
        child_profile={
            "child_name": "Moni",
            "age": 6,
            "difficulty_profile": "ADHD",
            "language_framework": "Benglish",
        },
    )
    print("Final State in session:", res["state"])
    print("Response JSON:")
    print(json.dumps(res["response"], indent=2))
