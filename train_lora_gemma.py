"""
KathaGemma - LoRA Fine-Tuning Script
This script performs QLoRA (4-bit quantized) fine-tuning on Gemma to:
1. Output structured JSON pedagogical frames.
2. Adapt to warm, regional code-switching dialects (Benglish/Hinglish) using AI4Bharat's IndicCorpV2.

NOTE ON WINDOWS EXECUTION:
To prevent UnicodeDecodeError when streaming IndicCorpV2 text on Windows:
Enable Python UTF-8 mode:
  powershell: $env:PYTHONUTF8="1"; python train_lora_gemma.py
  cmd: set PYTHONUTF8=1 && python train_lora_gemma.py
  direct flag: python -X utf8 train_lora_gemma.py
"""

import os
# Configure PyTorch memory allocation behavior to prevent fragmentation on limited GPUs
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

import json
import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer, SFTConfig

# 1. Configuration
MODEL_ID = "google/gemma-4-E2B-it"  # Upgraded to gemma-4-E2B-it for multimodal/reasoning capabilities
OUTPUT_DIR = "./kathagemma_lora_weights"
DATASET_PATH = "./dataset/structured_pedagogy_dataset.json"

# Set environment variables
os.environ["WANDB_DISABLED"] = "true"

def print_trainable_parameters(model):
    """Prints the number of trainable parameters in the model."""
    trainable_params = 0
    all_param = 0
    for _, param in model.named_parameters():
        all_param += param.numel()
        if param.requires_grad:
            trainable_params += param.numel()
    print(
        f"trainable params: {trainable_params} || all params: {all_param} || "
        f"trainable%: {100 * trainable_params / all_param:.4f}"
    )

def prepare_bilingual_finetuning_data():
    """
    Builds a large-scale training dataset combining IndicCorpV2 representation
    and structured JSON tutoring dialogues across multiple Indian languages.
    """
    print("Preparing structured dataset with IndicCorpV2 code-switched dialogues...")
    
    # Common regional vocabulary mappings to generate combinations
    vocab_map = {
        "bengali": {
            "cat": ["biral", "billi"], "tree": ["gas", "ped"], "red": ["lal"], "green": ["sabuj"],
            "bird": ["pakhi"], "flower": ["phool"], "sweet": ["mishti"], "flew": ["ure gelo"]
        },
        "hindi": {
            "cat": ["billi"], "tree": ["ped", "vriksh"], "red": ["lal"], "green": ["hara"],
            "bird": ["chidiya"], "flower": ["phool"], "sweet": ["mithai"], "flew": ["ud gaya"]
        },
        "telugu": {
            "cat": ["pilli"], "tree": ["chettu"], "red": ["lal", "kempu"], "green": ["pacha"],
            "bird": ["pitta"], "flower": ["puvvu"], "sweet": ["teepi"], "flew": ["egiri poyindi"]
        },
        "tamil": {
            "cat": ["poonai"], "tree": ["maram"], "red": ["sivappu"], "green": ["pasumai"],
            "bird": ["kili"], "flower": ["poo"], "sweet": ["inippu"], "flew": ["para"]
        },
        "marathi": {
            "cat": ["manjar"], "tree": ["jhad"], "red": ["lal"], "green": ["hirva"],
            "bird": ["pakshi"], "flower": ["phool"], "sweet": ["god"], "flew": ["udala"]
        }
    }
    
    dataset = []
    
    # 1. Generate Storytelling Cases
    stories = ["Mithai", "The Parrot", "Rice", "Pattal", "Wheat", "Mili's Balloon"]
    child_names = ["Aarav", "Meera", "Moni", "Sita", "Raju", "Karan"]
    
    # Generate storytelling cases
    for lang, terms in vocab_map.items():
        for story in stories:
            for child in child_names:
                cat_word = terms["cat"][0]
                tree_word = terms["tree"][0]
                prompt = f"Child says {lang}: 'Look at the {cat_word} near the {tree_word}!' Story context: {child} in garden. State: Comprehension."
                
                response_dict = {
                    "spoken_text": f"Yes, look at the cute little {cat_word} (cat) sitting near the {tree_word} (tree)! Can you say meow?",
                    "ui_action": "PLAY_TTS",
                    "ui_params": {"source": f"Grounded RAG - {story}"},
                    "pedagogical_state": "storytelling",
                    "expected_input": "speech"
                }
                dataset.append({
                    "prompt": prompt,
                    "completion": json.dumps(response_dict)
                })
                
                sweet_word = terms["sweet"][0]
                prompt_sweet = f"Child says {lang}: 'I want {sweet_word}!' Story context: {child} visits sweet shop. State: Comprehension."
                response_sweet = {
                    "spoken_text": f"Mmm, delicious {sweet_word} (sweet)! Raju is buying sweet laddoos too. Would you like to read or see the laddoos?",
                    "ui_action": "SHOW_CHOICES",
                    "ui_params": {"choices": ["Read about sweets", "See the shop"]},
                    "pedagogical_state": "storytelling",
                    "expected_input": "touch"
                }
                dataset.append({
                    "prompt": prompt_sweet,
                    "completion": json.dumps(response_sweet)
                })

    # 2. Generate Distraction Recovery Cases
    distracted_phrases = [
        "Look at my toy car!", "I have a crayon", "See my balloon", "Butterfly!"
    ]
    for child in child_names:
        for phrase in distracted_phrases:
            for lang, terms in vocab_map.items():
                green_word = terms["green"][0]
                red_word = terms["red"][0]
                
                prompt_cam = f"Child says: '{phrase}'. Story context: {child} reading. State: Distracted."
                response_cam = {
                    "spoken_text": f"Hey {child}! Let's play a search game! Find something {green_word} (green) in your room and show it to the camera!",
                    "ui_action": "TRIGGER_CAMERA",
                    "ui_params": {"target_prompt": f"Find something {green_word}"},
                    "pedagogical_state": "distraction_recovery",
                    "expected_input": "image"
                }
                dataset.append({
                    "prompt": prompt_cam,
                    "completion": json.dumps(response_cam)
                })
                
                prompt_draw = f"Child is silent, looking away. Story context: {child} reading. State: Distracted."
                response_draw = {
                    "spoken_text": f"Sssh... are you silent? Let's draw a nice {red_word} (red) flower on your whiteboard canvas!",
                    "ui_action": "SHOW_CANVAS",
                    "ui_params": {"target_prompt": f"Draw a {red_word} flower"},
                    "pedagogical_state": "distraction_recovery",
                    "expected_input": "canvas"
                }
                dataset.append({
                    "prompt": prompt_draw,
                    "completion": json.dumps(response_draw)
                })

    # Try downloading and merging AI4Bharat IndicCorpV2 data
    try:
        print("Downloading ai4bharat/IndicCorpV2 (bengali subset) tiny sample to merge representation...")
        # ai4bharat/IndicCorpV2 has 'indiccorp_v2' configuration; language files are stored in data/ as raw text files
        indic_dataset = load_dataset("ai4bharat/IndicCorpV2", "indiccorp_v2", data_files={"train": "data/bn.txt"}, split="train", streaming=True)
        samples = list(indic_dataset.take(10))
        
        for idx, sample in enumerate(samples):
            raw_text = sample.get("text", "")[:60]
            prompt = f"Translate and structure IndicCorpV2 speech: '{raw_text}'. State: Comprehension."
            response_dict = {
                "spoken_text": f"That sounds interesting! You said: {raw_text}. Let's continue our story.",
                "ui_action": "PLAY_TTS",
                "ui_params": {"detected_text": raw_text},
                "pedagogical_state": "storytelling",
                "expected_input": "speech"
            }
            dataset.append({
                "prompt": prompt,
                "completion": json.dumps(response_dict)
            })
        print(f"Merged {len(samples)} IndicCorpV2 text samples into the structured training dataset.")
    except Exception as e:
        print(f"IndicCorpV2 remote loading skipped/failed: {e}. Using local synthesis.")

    os.makedirs(os.path.dirname(DATASET_PATH), exist_ok=True)
    with open(DATASET_PATH, 'w') as f:
        json.dump(dataset, f, indent=2)
    print(f"Successfully generated {len(dataset)} structured JSON training examples at {DATASET_PATH}")

def main():
    # 2. Check for GPU
    device_map = "auto"
    if not torch.cuda.is_available():
        print("WARNING: CUDA is not available. Running on CPU (NOT RECOMMENDED for training!)")
        device_map = {"": "cpu"}
        compute_dtype = torch.float32
        quantization_config = None
    else:
        print(f"CUDA Available. Active GPU: {torch.cuda.get_device_name(0)}")
        compute_dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
        
        # 3. 4-Bit Quantization Configuration
        quantization_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=compute_dtype,
            bnb_4bit_use_double_quant=True
        )

    # 4. Prepare data
    prepare_bilingual_finetuning_data()

    # 5. Load Tokenizer & Model
    print(f"Loading tokenizer for {MODEL_ID}...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, add_eos_token=True)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    print(f"Loading quantized model {MODEL_ID}...")
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        quantization_config=quantization_config,
        device_map=device_map,
        torch_dtype=compute_dtype if quantization_config else torch.float32,
        low_cpu_mem_usage=True  # Force loading shards to CPU first to prevent 8.75 GB safetensors allocation spike on GPU
    )

    if quantization_config:
        model = prepare_model_for_kbit_training(model)

    # 6. PEFT (LoRA) Configuration
    peft_config = LoraConfig(
        r=16,
        lora_alpha=32,
        target_modules=[
            "q_proj.linear", 
            "k_proj.linear", 
            "v_proj.linear", 
            "o_proj.linear", 
            "gate_proj.linear", 
            "up_proj.linear", 
            "down_proj.linear"
        ],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM"
    )
    # Load dataset
    dataset = load_dataset("json", data_files=DATASET_PATH, split="train")

    def format_prompts(example):
        """Converts a single raw prompt-response example into conversational format using the model's official chat template."""
        messages = [
            {"role": "user", "content": example["prompt"]},
            {"role": "assistant", "content": example["completion"]}
        ]
        return tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)

    # Format the dataset before passing to trainer to avoid completion_only_loss validation conflicts
    print("Formatting training dataset...")
    dataset = dataset.map(
        lambda x: {"text": format_prompts(x)},
        remove_columns=dataset.column_names
    )

    # 7. SFT Configuration
    training_args = SFTConfig(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        warmup_steps=10,  # Replaced deprecated warmup_ratio with warmup_steps
        num_train_epochs=3,
        learning_rate=2e-4,
        fp16=not torch.cuda.is_bf16_supported() if torch.cuda.is_available() else False,
        bf16=torch.cuda.is_bf16_supported() if torch.cuda.is_available() else False,
        logging_steps=10,
        save_strategy="epoch",
        optim="paged_adamw_8bit" if torch.cuda.is_available() else "adamw_torch",
        report_to="none",
        max_length=512,  # Moved inside SFTConfig for compatibility with trl v0.12+
        dataset_text_field="text"  # Set to "text" since dataset is mapped
    )

    # 8. SFT Trainer
    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        peft_config=peft_config,
        processing_class=tokenizer,
        args=training_args,
    )

    # 9. Train and Save
    print("Starting QLoRA training sprint...")
    trainer.train()

    print(f"Training complete. Saving adapter weights to {OUTPUT_DIR}...")
    trainer.model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print("Adapter weights saved successfully.")

if __name__ == "__main__":
    main()
