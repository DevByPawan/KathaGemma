import os
import json
import chromadb
from sentence_transformers import SentenceTransformer
from agent_orchestrator import run_adk_orchestration, RAG_AVAILABLE

def evaluate_rag():
    print("\n==========================================")
    print("Evaluating RAG Pipeline (ChromaDB Retrieval)")
    print("==========================================\n")
    
    if not RAG_AVAILABLE:
        print("RAG not available. Skipping active RAG evaluation.")
        return 0.0

    # Extended RAG test cases mapping queries to expected book titles in the full database
    rag_test_cases = [
        {"query": "sweet laddoo and round sweets shop maker", "expected_book": "Mithai"},
        {"query": "parrot sitting on a branch flying bird", "expected_book": "The"},
        {"query": "eating hot rice from plate food chawal", "expected_book": "Rice"},
        {"query": "leaf plates or pattal for eating lunch", "expected_book": "Pattal"},
        {"query": "wheat field and making chapati flour bread", "expected_book": "Wheat"},
        {"query": "red balloon floating in the sky", "expected_book": "balloon"},
        {"query": "hair clip and flowers on head", "expected_book": "Floral"},
        {"query": "whistle of Jeet and blowing sound", "expected_book": "Jeet"}
    ]

    chroma_client = chromadb.PersistentClient(path="./chromadb_store")
    try:
        collection = chroma_client.get_collection(name="kathagemma_corpus")
        embed_model = SentenceTransformer("all-MiniLM-L6-v2")
    except Exception as e:
        print(f"Failed to load RAG dependencies: {e}")
        return 0.0

    hits = 0
    total = len(rag_test_cases)
    
    for case in rag_test_cases:
        query = case["query"]
        expected = case["expected_book"].lower()
        
        emb = embed_model.encode([query]).tolist()
        results = collection.query(query_embeddings=emb, n_results=3)
        
        matched = False
        retrieved_books = []
        if results and results["metadatas"] and results["metadatas"][0]:
            for meta in results["metadatas"][0]:
                book_title = meta.get("book_title", "").lower()
                retrieved_books.append(meta.get("book_title", ""))
                if expected in book_title or book_title in expected:
                    matched = True
                    break
        
        if matched:
            hits += 1
            print(f"PASS | Query: '{query}' -> Retrieved: '{retrieved_books[0]}' (Expected: '{case['expected_book']}')")
        else:
            print(f"FAIL | Query: '{query}' -> Top Retrieved: '{retrieved_books[0] if retrieved_books else 'None'}' (Expected: '{case['expected_book']}')")

    accuracy = (hits / total) * 100
    print(f"\nRAG Evaluation Result: {hits}/{total} Hits ({accuracy:.1f}%)")
    return accuracy

def evaluate_multi_agent_system():
    print("\n==========================================")
    print("Evaluating Multi-Agent States & JSON Output (ADK)")
    print("==========================================\n")
    
    # Dataset-driven evaluation cases matching distinct child profiles
    eval_cases = [
        # Profile 1: Focused English Learner
        {
            "profile": {
                "child_name": "Aarav", "age": 5, 
                "difficulty_profile": "standard", "language_framework": "English"
            },
            "steps": [
                {"input": "Tell me about the sweet shop.", "exp_action": "PLAY_TTS", "exp_pedagogy": "storytelling"},
                {"input": "Wow, the laddoos are round!", "exp_action": "PLAY_TTS", "exp_pedagogy": "storytelling"}
            ]
        },
        # Profile 2: ADHD Benglish Learner (Spontaneous toys drift & silence timeouts)
        {
            "profile": {
                "child_name": "Moni", "age": 6, 
                "difficulty_profile": "ADHD", "language_framework": "Benglish"
            },
            "steps": [
                {"input": "Look at my red toy car! Zoom!", "exp_action": "TRIGGER_CAMERA", "exp_pedagogy": "distraction_recovery"},
                {"input": "[Aarav is silent, looking away]", "exp_action": "SHOW_CANVAS", "exp_pedagogy": "distraction_recovery"}
            ]
        },
        # Profile 3: Tired Learner
        {
            "profile": {
                "child_name": "Rohan", "age": 5, 
                "difficulty_profile": "standard", "language_framework": "English"
            },
            "steps": [
                {"input": "I am sleepy and tired.", "exp_action": "SHOW_CHOICES", "exp_pedagogy": "distraction_recovery"}
            ]
        },
        # Profile 4: Code-switched Multi-lingual Learner (Bengali, Hindi, Telugu, Marathi inputs)
        {
            "profile": {
                "child_name": "Sita", "age": 7, 
                "difficulty_profile": "standard", "language_framework": "Benglish"
            },
            "steps": [
                {"input": "gas ke upar biral hai", "exp_action": "PLAY_TTS", "exp_pedagogy": "storytelling"}, # Bengali code-switch
                {"input": "Raju ped ke upar chadh gaya", "exp_action": "PLAY_TTS", "exp_pedagogy": "storytelling"}, # Hindi code-switch
                {"input": "surkh balloon ure gelo", "exp_action": "PLAY_TTS", "exp_pedagogy": "storytelling"} # Urdu/Bengali mixture
            ]
        }
    ]

    total_checks = 0
    passed_routing = 0
    passed_translation = 0
    passed_json_format = 0
    
    for case_idx, case in enumerate(eval_cases):
        profile = case["profile"]
        print(f"Testing Profile: {profile['child_name']} ({profile['difficulty_profile']} - {profile['language_framework']})")
        
        session_id = f"eval_session_{case_idx}"
        
        for step_idx, step in enumerate(case["steps"]):
            total_checks += 1
            user_input = step["input"]
            exp_action = step["exp_action"]
            exp_pedagogy = step["exp_pedagogy"]
            
            # Execute step through Google ADK runner loop
            result = run_adk_orchestration(
                user_input=user_input,
                session_id=session_id,
                child_profile=profile
            )
            
            response = result["response"]
            state = result["state"]
            
            # 1. JSON Schema validation
            required_keys = ["spoken_text", "ui_action", "ui_params", "pedagogical_state", "expected_input"]
            valid_json = all(k in response for k in required_keys)
            if valid_json:
                passed_json_format += 1
                
            # 2. State routing validation
            actual_action = response.get("ui_action")
            actual_pedagogy = response.get("pedagogical_state")
            routing_match = (actual_action == exp_action) and (actual_pedagogy == exp_pedagogy)
            if routing_match:
                passed_routing += 1
                
            # 3. Translation validation
            # Checks if the sensory node translated code-switched terms (e.g. biral -> cat, ped -> tree)
            user_input_normalized = state.get("user_input", "").lower()
            translation_worked = True
            if "biral" in user_input.lower() and "cat" not in user_input_normalized:
                translation_worked = False
            if "ped" in user_input.lower() and "tree" not in user_input_normalized:
                translation_worked = False
                
            if translation_worked:
                passed_translation += 1
                
            print(f"  Step {step_idx+1} | Input: '{user_input[:25]}...' -> Action: '{actual_action}' | Schema OK: {valid_json} | Route OK: {routing_match}")

    routing_score = (passed_routing / total_checks) * 100
    json_score = (passed_json_format / total_checks) * 100
    trans_score = (passed_translation / total_checks) * 100
    
    print("\nMulti-Agent Evaluation Results:")
    print(f"- ADK Graph Routing Accuracy: {passed_routing}/{total_checks} matches ({routing_score:.1f}%)")
    print(f"- Multilingual Translation Success: {passed_translation}/{total_checks} translates ({trans_score:.1f}%)")
    print(f"- Structured JSON Schema Adherence: {passed_json_format}/{total_checks} conformant ({json_score:.1f}%)")
    
    return routing_score, trans_score, json_score

def main():
    rag_score = evaluate_rag()
    routing_score, trans_score, json_score = evaluate_multi_agent_system()
    
    print("\n" + "=" * 45)
    print("      KATHAGEMMA SYSTEM REPORT (ADK)")
    print("=" * 45)
    print(f"1. RAG Retrieval Hit Rate:          {rag_score:.1f}%")
    print(f"2. ADK Graph Routing Accuracy:      {routing_score:.1f}%")
    print(f"3. Multilingual Translation Rate:   {trans_score:.1f}%")
    print(f"4. Structured JSON Adherence Rate:  {json_score:.1f}%")
    print("=" * 45)

if __name__ == "__main__":
    main()
