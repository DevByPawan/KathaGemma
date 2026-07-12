"""
KathaGemma - End-to-End Voice-First Interactive Demo Flow
This script demonstrates the complete KathaGemma pipeline:
1. Audio recording from microphone using sounddevice.
2. Audio transcription using a local OpenAI Whisper model.
3. ADK multi-agent graph execution (agent_orchestrator.py).
4. Full RAG context grounding in ChromaDB (10,450+ chunks).
5. Audio Text-to-Speech (TTS) playback using SAPI5 (pyttsx3) or Google Cloud TTS.
6. Sensor routing simulation (Microphone, Camera, Whiteboard Canvas).
"""

import os
import sys
import time
import json
import warnings

# Suppress warnings from PyTorch/NumPy
warnings.filterwarnings("ignore")

# Setup terminal styling
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# 1. PRE-LOAD HEAVY WEIGHTS SYNCHRONOUSLY
# This guarantees that SentenceTransformer and ChromaDB finish loading and printing
# before we request any interactive user inputs, preventing console corruption.
print(f"{Colors.BOLD}Pre-loading database and neural models...{Colors.ENDC}")
sys.path.append(os.path.abspath("."))
from agent_orchestrator import run_adk_orchestration

print("Initializing sounddevice and recording APIs...")
import sounddevice as sd
from scipy.io.wavfile import write

# Initialize TTS Voice Engine (pyttsx3)
print("Initializing SAPI5 Text-to-Speech engine...")
try:
    import pyttsx3
    engine = pyttsx3.init()
    engine.setProperty('rate', 145)  # Warm reading speed
    voices = engine.getProperty('voices')
    for voice in voices:
        if "EN" in voice.id or "english" in voice.name.lower():
            engine.setProperty('voice', voice.id)
            break
    TTS_AVAILABLE = True
except Exception as e:
    print(f"Local TTS initialization skipped: {e}")
    TTS_AVAILABLE = False

# Initialize local Whisper Speech-to-Text Model
print("Loading local OpenAI Whisper model (tiny for zero-latency execution)...")
try:
    import whisper
    whisper_model = whisper.load_model("tiny")
    WHISPER_AVAILABLE = True
    print("Whisper model loaded successfully!")
except Exception as e:
    print(f"Whisper initialization failed: {e}. Falling back to console inputs.")
    WHISPER_AVAILABLE = False

WAV_FILENAME = "child_utterance.wav"

def flush_input_buffer():
    """Flushes trailing newlines and background characters from the stdin input stream."""
    try:
        import msvcrt
        while msvcrt.kbhit():
            msvcrt.getch()
    except (ImportError, AttributeError):
        try:
            import select
            while select.select([sys.stdin], [], [], 0.0)[0]:
                sys.stdin.read(1)
        except Exception:
            pass

def record_audio(duration=5, fs=16000) -> bool:
    """Records duration seconds of audio from default microphone to WAV_FILENAME."""
    print(f"\n{Colors.WARNING}[MICROPHONE ACTIVE - SPEAK NOW FOR {duration} SECONDS]{Colors.ENDC}")
    try:
        myrecording = sd.rec(int(duration * fs), samplerate=fs, channels=1)
        for remaining in range(duration, 0, -1):
            print(f"  Recording... {remaining}s remaining", end="\r", flush=True)
            time.sleep(1)
        sd.wait()  # Wait until recording is finished
        write(WAV_FILENAME, fs, myrecording)
        print("  Recording saved.           ")
        return True
    except Exception as e:
        print(f"\nFailed to record audio from microphone: {e}")
        return False

def transcribe_audio() -> str:
    """Transcribes WAV_FILENAME using Whisper."""
    if not WHISPER_AVAILABLE or not os.path.exists(WAV_FILENAME):
        return ""
    print("Transcribing audio stream using Whisper...")
    try:
        result = whisper_model.transcribe(WAV_FILENAME, language="en")
        text = result.get("text", "").strip()
        return text
    except Exception as e:
        print(f"Whisper transcription failed: {e}")
        return ""

def speak_narrative(text):
    """Speaks the text using the local TTS engine and displays subtitle output."""
    print(f"\n{Colors.BLUE}{Colors.BOLD}[KathaGemma speaks]:{Colors.ENDC} {text}")
    if TTS_AVAILABLE:
        try:
            engine.say(text)
            engine.runAndWait()
        except Exception:
            pass

def run_camera_vision_simulation(target_prompt) -> str:
    """Simulates front camera object capture."""
    print(f"\n{Colors.WARNING}--- [FRONT CAMERA WINDOW RENDERED ON DEVICE] ---{Colors.ENDC}")
    print(f"Camera Prompt: '{target_prompt}'")
    print("Please hold up an object to the camera or select from the demo menu:")
    print("  1. Child holds up a Green Leaf")
    print("  2. Child holds up a Red Toy Car")
    print("  3. Child holds up a blue pen")
    
    flush_input_buffer()
    choice = input("Select mock camera tag (1-3): ")
    if choice == "1":
        print(f"{Colors.GREEN}[Camera Tag]: Identified 'green leaf'. Sent to Gemma Vis.{Colors.ENDC}")
        return "green leaf"
    elif choice == "2":
        print(f"{Colors.GREEN}[Camera Tag]: Identified 'toy car'. Sent to Gemma Vis.{Colors.ENDC}")
        return "toy car"
    else:
        print(f"{Colors.GREEN}[Camera Tag]: Identified 'blue pen'.{Colors.ENDC}")
        return "blue pen"

def run_canvas_simulation(target_prompt) -> str:
    """Simulates finger canvas tracing."""
    print(f"\n{Colors.WARNING}--- [SCREEN WHITEBOARD CANVAS OPENED] ---{Colors.ENDC}")
    print(f"Canvas Prompt: '{target_prompt}'")
    print("The child draws a road/shape on the screen with their finger...")
    flush_input_buffer()
    input("  Press Enter once drawing is completed...")
    print(f"{Colors.GREEN}[Canvas Stroke]: Drawing processed and saved.{Colors.ENDC}")
    return "Child completed drawing"

def run_touch_simulation(choices) -> str:
    """Simulates multi-choice bubble card tap."""
    print(f"\n{Colors.WARNING}--- [CHOICE BUBBLE CARDS DISPLAYED] ---{Colors.ENDC}")
    for idx, choice in enumerate(choices):
        print(f"  [{idx+1}] Card: \"{choice}\"")
        
    flush_input_buffer()
    user_bubble = input(f"Tap on a card (1-{len(choices)}): ")
    selected_choice = choices[int(user_bubble)-1] if user_bubble.isdigit() and 0 < int(user_bubble) <= len(choices) else choices[0]
    print(f"{Colors.GREEN}[Touch Input]: selected card \"{selected_choice}\"{Colors.ENDC}")
    return selected_choice

def explain_demo_goals():
    print(f"\n{Colors.HEADER}==================================================")
    print("      KathaGemma End-to-End Multimodal Demo       ")
    print("==================================================")
    print("Phase 1: Captures voice inputs via sounddevice + Whisper.")
    print("Phase 2: Routes state via Google ADK graphs with ChromaDB RAG.")
    print("Phase 3: Renders screen UI states and speaks via local TTS.")
    print("==================================================")
    print(f"Note: Exposing this ADK backend to the React UI is fully supported!")
    print(f"Run 'uvicorn app:app --reload' to start the local REST API server.{Colors.ENDC}\n")

def main():
    explain_demo_goals()
    
    # Configure Child profile for the demo
    print("Configure child profile for this session:")
    flush_input_buffer()
    name = input("Child Name (default: Aarav): ").strip() or "Aarav"
    profile = {
        "child_name": name,
        "age": 5,
        "difficulty_profile": "standard",  # standard or ADHD
        "language_framework": "English"    # English, Hinglish, or Benglish
    }
    
    print("\nSelect difficulty profile:")
    print("  1. Standard profile (normal pacing)")
    print("  2. ADHD profile (accelerates camera/canvas recovery quests on distraction)")
    flush_input_buffer()
    diff_choice = input("Enter choice (1-2): ")
    if diff_choice == "2":
        profile["difficulty_profile"] = "ADHD"
        
    print("\nSelect language framework:")
    print("  1. English")
    print("  2. Benglish (code-switched Bengali-English)")
    print("  3. Hinglish (code-switched Hindi-English)")
    flush_input_buffer()
    lang_choice = input("Enter choice (1-3): ")
    if lang_choice == "2":
        profile["language_framework"] = "Benglish"
    elif lang_choice == "3":
        profile["language_framework"] = "Hinglish"
        
    print(f"\n{Colors.GREEN}Active child profile loaded:{Colors.ENDC}")
    print(json.dumps(profile, indent=2))
    
    session_id = f"demo_session_{int(time.time())}"
    user_id = f"demo_child_{name.lower()}"
    
    # Starting narration
    spoken_narrative = f"Hello {name}! Let's read a story. Today we are reading Mithai. Mithai was a sweet shop owner. He made tasty round laddoos every morning. What did Mithai make?"
    speak_narrative(spoken_narrative)
    
    # Initial state inputs
    child_speech = ""
    vision_input = ""
    
    while True:
        print("\n" + "-"*40)
        print(f"{Colors.BOLD}Select Child Input Mode:{Colors.ENDC}")
        print("  1. Speak via Microphone (Whisper Transcription)")
        print("  2. Type Text Input (Fallback console keyboard)")
        print("  3. Simulate telemetry: [Silent / Look Away] (Triggers recovery quest)")
        print("  4. Exit Demo")
        
        flush_input_buffer()
        mode = input("Enter mode (1-4): ")
        if mode == "1":
            success = record_audio(duration=5)
            if success:
                child_speech = transcribe_audio()
                print(f"{Colors.GREEN}Whisper Transcription: '{child_speech}'{Colors.ENDC}")
            if not child_speech:
                print(f"{Colors.WARNING}No voice transcription. Falling back to typing.{Colors.ENDC}")
                flush_input_buffer()
                child_speech = input("Type response: ")
        elif mode == "2":
            flush_input_buffer()
            child_speech = input("Type response: ")
        elif mode == "3":
            child_speech = f"[{name} is silent, looking away. Gaze tracking lost]"
            print(f"{Colors.GREEN}Telemetry triggered: '{child_speech}'{Colors.ENDC}")
        elif mode == "4":
            print("\nExiting KathaGemma Interactive Demo.")
            break
        else:
            print("Invalid input.")
            continue
            
        print("\nProcessing turn with Google ADK graph agent nodes...")
        result = run_adk_orchestration(
            user_input=child_speech,
            vision_input=vision_input,
            session_id=session_id,
            user_id=user_id,
            child_profile=profile
        )
        
        # Reset visual tags
        vision_input = ""
        
        response = result["response"]
        state = result["state"]
        
        # Print JSON Frame
        print(f"\n{Colors.HEADER}=== UI Structured JSON Output (ADK) ==={Colors.ENDC}")
        print(json.dumps(response, indent=2))
        print("=========================================\n")
        
        # TTS Speak
        spoken_text = response.get("spoken_text", "")
        speak_narrative(spoken_text)
        
        # Route device components based on JSON action
        ui_action = response.get("ui_action")
        ui_params = response.get("ui_params", {})
        
        if ui_action == "TRIGGER_CAMERA":
            target = ui_params.get("target_prompt", "Show object")
            vision_input = run_camera_vision_simulation(target)
            # Trigger immediate follow-up turn in RAG
            child_speech = f"I hold up {vision_input}"
            
        elif ui_action == "SHOW_CANVAS":
            target = ui_params.get("target_prompt", "Draw shape")
            child_speech = run_canvas_simulation(target)
            
        elif ui_action == "SHOW_CHOICES":
            choices = ui_params.get("choices", [])
            child_speech = run_touch_simulation(choices)

if __name__ == "__main__":
    main()
