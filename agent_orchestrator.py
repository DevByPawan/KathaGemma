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
USE_LOCAL_LORA = os.environ.get("USE_LOCAL_LORA") == "1" or os.path.exists("./kathagemma_lora_weights")
local_lora_model = None
local_lora_tokenizer = None

if USE_LOCAL_LORA:
    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
        from peft import PeftModel
        print("USE_LOCAL_LORA is enabled. Loading local fine-tuned LoRA adapter from ./kathagemma_lora_weights...")
        # Load base model
        base_model = AutoModelForCausalLM.from_pretrained(
            "google/gemma-4-E2B-it",
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto" if torch.cuda.is_available() else None,
            low_cpu_mem_usage=True
        )
        # Load LoRA adapter
        local_lora_model = PeftModel.from_pretrained(base_model, "./kathagemma_lora_weights", strict=False)
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
        model_kwargs={"response_mime_type": "application/json"}
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
    "biral": "cat", "billi": "cat", "pilli": "cat", "poonai": "cat", "manjar": "cat", # Ben, Hin, Tel, Tam, Mar
    "shukah": "parrot", "tota": "parrot", "chiluka": "parrot", "kili": "parrot", "popat": "parrot",
    "hathi": "elephant", "enugu": "elephant", "yanai": "elephant", "gaja": "elephant",
    # Colors
    "lal": "red", "kempu": "red", "sivappu": "red", "tambda": "red", "surkh": "red", # Ben/Hin, Tel, Tam, Mar, Urd
    "sabuj": "green", "hara": "green", "pacha": "green", "pasumai": "green", "hirva": "green",
    # Common Nouns & Verbs
    "gas": "tree", "ped": "tree", "chettu": "tree", "maram": "tree", "jhad": "tree",
    "balloon": "balloon", "gubbara": "balloon", "ubbara": "balloon",
    "mithai": "sweet", "mishti": "sweet", "teepi": "sweet", "inippu": "sweet",
    "ure": "flew", "ud": "flew", "egiri": "flew", "para": "flew"
}

def translate_multilingual_chatter(text: str, language_framework: str = "English") -> str:
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
    if not translated_any and ACTIVE_MODE and llm:
        print(f"OOV Code-Switch Detected. Running Gemini dynamic translation on: '{text_lower}'")
        translation_prompt = f"""
        You are a multilingual child speech translator.
        Translate this code-switched or regional Indian language child response to plain English.
        Detect words from languages like Bengali, Hindi, Telugu, Tamil, Marathi, Urdu, Kannada, Malayalam, etc.
        Return a JSON structure: {{"translated_text": "plain English translation", "detected_language": "language name"}}
        Input child response: "{text_lower}"
        """
        try:
            response = llm.invoke([HumanMessage(content=translation_prompt)])
            resp_content = response.content.strip()
            if "```json" in resp_content:
                resp_content = resp_content.split("```json")[1].split("```")[0].strip()
            elif resp_content.startswith("```"):
                resp_content = resp_content.split("```")[1].split("```")[0].strip()
            parsed = json.loads(resp_content)
            translated_text = parsed.get("translated_text", text_lower)
            lang = parsed.get("detected_language", "unknown")
            print(f"Dynamic Translator: Detected {lang} -> Translated: '{translated_text}'")
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
    difficulty_profile = context.state.get("difficulty_profile", "standard") # standard, ADHD, mild
    
    print(f"Node: Attention Tracker -> Active Child Profile: Name: {child_name}, Difficulty: {difficulty_profile}")
    
    # Telemetry check (enclosed in brackets)
    is_sensor_trigger = user_input.startswith("[") and user_input.endswith("]")
    
    # Classify state
    if is_sensor_trigger or not user_input or "silent" in user_input or "look away" in user_input:
        attention_state = "distracted"
        consec_distractions += 1
    elif "toy car" in user_input or "butterfly" in user_input or "crayon" in user_input:
        # ADHD children drift cognitive focus to local toys
        attention_state = "distracted"
        consec_distractions += 1
    elif "tired" in user_input or "sleepy" in user_input or "cry" in user_input:
        attention_state = "tired"
        consec_distractions = 0
    else:
        attention_state = "focused"
        consec_distractions = 0
        
    context.state["attention_state"] = attention_state
    context.state["consecutive_distractions"] = consec_distractions
    
    print(f"Node: Attention Tracker -> Attention: {attention_state} (Consecutive: {consec_distractions})")
    
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
            current_story = context.state.get("current_story", "Mithai")
            
            results = None
            if current_story:
                try:
                    # Filter search to current book to prevent cross-story content leak
                    results = collection.query(
                        query_embeddings=query_embedding,
                        where={"book_title": current_story},
                        n_results=1
                    )
                except Exception:
                    pass
                    
            if not results or not results["documents"] or not results["documents"][0]:
                results = collection.query(
                    query_embeddings=query_embedding,
                    n_results=1
                )
            if results and results["documents"] and results["documents"][0]:
                retrieved_text = results["documents"][0][0]
                meta = results["metadatas"][0][0]
                illustration_path = meta.get("illustration_image", "None")
                source_info = f"{meta.get('source', 'RAG')} - {meta.get('book_title', 'Story')}"
                print(f"RAG Retrieval -> Grounded: '{source_info}' | Illustration: '{illustration_path}'")
        except Exception as e:
            print(f"RAG retrieval error: {e}")
            
    if not retrieved_text:
        # Fallback story
        default_stories = [
            "Mithai was a sweet shop owner. He made tasty round laddoos every morning.",
            "One sunny day, a little monkey came to the shop. It saw the laddoos and wanted one.",
            "Mimi was holding a lal balloon. Suddenly the balloon flew away past the trees.",
            "The parrot was sitting on the mango tree branch, eating a yellow sweet fruit."
        ]
        retrieved_text = default_stories[story_index % len(default_stories)]
        source_info = "Default Story Board"
        
    # Dynamically structure the storytelling speech with child name and language framework
    if "benglish" in lang_framework.lower():
        narrative = f"Look, {child_name}! {retrieved_text} Oh! What a beautiful Biral or bird is there! Can you say it?"
    elif "hinglish" in lang_framework.lower():
        narrative = f"Look, {child_name}! {retrieved_text} Dekho, kitna tasty sweet laddoo hai! Can you see it?"
    else:
        narrative = f"Wow, {child_name}! {retrieved_text} What do you think happens next?"
        
    # Update state variables
    context.state["recommended_text"] = narrative
    context.state["ui_action"] = "PLAY_TTS"
    context.state["ui_params"] = {
        "source": source_info,
        "illustration_image": illustration_path
    }
    context.state["expected_input"] = "speech"
    context.state["pedagogical_state"] = "storytelling"
    context.state["story_index"] = story_index + 1
    
    return {"status": "storytelling_complete"}

def active_recovery_node(context: Context) -> dict:
    """
    Node: Active Recovery Branch.
    Designs tactile and sensory recovery quests.
    """
    consec_distractions = context.state.get("consecutive_distractions", 1)
    child_name = context.state.get("child_name", "Aarav")
    difficulty_profile = context.state.get("difficulty_profile", "standard")
    
    # ADHD child triggers recovery quests faster
    if difficulty_profile == "ADHD":
        verbal_nudge_prefix = f"Hey {child_name}! Let's do something fun! "
    else:
        verbal_nudge_prefix = f"Hey {child_name}, let's play a small game together. "

    if consec_distractions % 2 == 1:
        # Camera Quest
        narrative = verbal_nudge_prefix + "Find a green object in your room, like a leaf or toy, and show it to my camera! Let's help Raju cross the grass!"
        ui_action = "TRIGGER_CAMERA"
        ui_params = {"target_prompt": "Find something green"}
        expected_input = "image"
    else:
        # Canvas whiteboard Quest
        narrative = verbal_nudge_prefix + "Use your finger to draw a round yellow sun on the screen whiteboard!"
        ui_action = "SHOW_CANVAS"
        ui_params = {"target_prompt": "Draw a yellow sun"}
        expected_input = "canvas"
        
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
    narrative = f"Oh, {child_name}! You look a bit tired. Let's take a slow, deep breath. Sshhh... Would you like me to sing a soft lullaby or tell a funny riddle?"
    
    context.state["recommended_text"] = narrative
    context.state["ui_action"] = "SHOW_CHOICES"
    context.state["ui_params"] = {
        "choices": ["Sing a Lullaby", "Tell a Riddle"]
    }
    context.state["expected_input"] = "touch"
    context.state["pedagogical_state"] = "distraction_recovery"
    
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
            import torch
            messages = [
                {"role": "user", "content": prompt},
            ]
            device = next(local_lora_model.parameters()).device
            inputs = local_lora_tokenizer.apply_chat_template(messages, return_tensors="pt", add_generation_prompt=True).to(device)
            with torch.no_grad():
                outputs = local_lora_model.generate(
                    inputs,
                    max_new_tokens=256,
                    temperature=0.7,
                    top_p=0.95,
                    do_sample=True
                )
            raw_text = local_lora_tokenizer.decode(outputs[0][inputs.shape[1]:], skip_special_tokens=True).strip()
            # Clean formatting blocks
            if raw_text.startswith("```json"):
                raw_text = raw_text.split("```json")[1].split("```")[0].strip()
            elif raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1].split("```")[0].strip()
            final_json = json.loads(raw_text)
            print("Successfully compiled structured JSON using local LoRA adapter model!")
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Local LoRA compiler block failed: {e}. Falling back.")

    # 2. Active Gemma-4 compile pass (simplified prompt if model is fine-tuned)
    if not final_json and ACTIVE_MODE and llm:
        # Note: If the base Gemma model is fine-tuned, this prompt simplifies massively
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
            response = llm.invoke([
                SystemMessage(content="You are a JSON compiler outputting the schema exactly."),
                HumanMessage(content=prompt)
            ])
            raw_text = response.content.strip()
            # Clean formatting blocks
            if raw_text.startswith("```json"):
                raw_text = raw_text.split("```json")[1].split("```")[0].strip()
            elif raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1].split("```")[0].strip()
            final_json = json.loads(raw_text)
        except Exception as e:
            print(f"Gemini compiler block failed: {e}. Running fallback formatter.")
            
    # 2. Local Fallback Compiler
    if not final_json:
        final_json = {
            "spoken_text": recommended_text,
            "ui_action": ui_action,
            "ui_params": ui_params,
            "pedagogical_state": pedagogical_state,
            "expected_input": expected_input
        }
        
    # Schema validation
    required_keys = ["spoken_text", "ui_action", "ui_params", "pedagogical_state", "expected_input"]
    for key in required_keys:
        if key not in final_json:
            if key == "spoken_text": final_json["spoken_text"] = recommended_text
            elif key == "ui_action": final_json["ui_action"] = ui_action
            elif key == "ui_params": final_json["ui_params"] = ui_params
            elif key == "pedagogical_state": final_json["pedagogical_state"] = pedagogical_state
            elif key == "expected_input": final_json["expected_input"] = expected_input

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
        (attention_tracker_node, {
            "storytelling": storytelling_node,
            "recovery": active_recovery_node,
            "calming": calming_node
        }),
        (storytelling_node, json_orchestrator_node),
        (active_recovery_node, json_orchestrator_node),
        (calming_node, json_orchestrator_node)
    ]
)

# Compile ADK Runner instance
session_service = InMemorySessionService()
runner = Runner(
    app_name="kathagemma_app",
    agent=workflow,
    session_service=session_service,
    auto_create_session=True
)

def run_adk_orchestration(
    user_input: str,
    vision_input: str = "",
    session_id: str = "s1",
    user_id: str = "child_1",
    child_profile: Dict[str, Any] = None
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
            "language_framework": "English"
        }
        
    # Check if session exists, else create it
    try:
        session = asyncio.run(runner.session_service.get_session(
            app_name="kathagemma_app", session_id=session_id, user_id=user_id
        ))
    except Exception:
        session = None
        
    if session is None:
        # Create fresh session state
        initial_state = {
            "story_index": 0,
            "consecutive_distractions": 0,
            "history": []
        }
        initial_state.update(child_profile)
        asyncio.run(runner.session_service.create_session(
            app_name="kathagemma_app",
            session_id=session_id,
            user_id=user_id,
            state=initial_state
        ))
        session = asyncio.run(runner.session_service.get_session(
            app_name="kathagemma_app", session_id=session_id, user_id=user_id
        ))
        
    # Manually update state in the session object before running, committing it to session database
    session.state["user_input"] = user_input
    session.state["vision_input"] = vision_input
    for k, v in child_profile.items():
        session.state[k] = v
    runner.session_service.sessions["kathagemma_app"][user_id][session_id] = session

    # Execute step
    res_gen = runner.run(
        user_id=user_id,
        session_id=session_id,
        new_message=None
    )
    
    # Consume runner execution stream
    for event in res_gen:
        pass
        
    # Fetch final state and response
    updated_session = asyncio.run(runner.session_service.get_session(
        app_name="kathagemma_app", session_id=session_id, user_id=user_id
    ))
    
    response = updated_session.state.get("final_response_json", {})
    
    # Return updated session dictionary alongside the JSON response
    return {
        "state": updated_session.state,
        "response": response
    }

if __name__ == "__main__":
    # Test execution
    print("\n--- Running ADK Orchestrator Self-Test (Benglish Child) ---")
    res = run_adk_orchestration(
        user_input="Look at the Biral",
        child_profile={"child_name": "Moni", "age": 6, "difficulty_profile": "ADHD", "language_framework": "Benglish"}
    )
    print("Final State in session:", res["state"])
    print("Response JSON:")
    print(json.dumps(res["response"], indent=2))
