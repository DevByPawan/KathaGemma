import os
import re
import json
import urllib.request
import urllib.parse
import fitz
import chromadb
from sentence_transformers import SentenceTransformer
from datasets import load_dataset
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Configuration
DB_DIR = "./chromadb_store"
PDF_DIR = "./dataset/barkha_pdfs"
IMAGE_DIR = "./dataset/barkha_images"
os.makedirs(PDF_DIR, exist_ok=True)
os.makedirs(IMAGE_DIR, exist_ok=True)

# Full collection of 17 English Barkha Series book identifiers on Internet Archive
BARKHA_IDENTIFIERS = [
    "1-mithai-level-1-18151",
    "1-the-parrot-level-1-18156",
    "1-mili-balloon-level-1-18157",
    "1-munmun-munnu-level-1-18159",
    "1-yummy-gulgule-level-1-18154_202308",
    "2-rice-level-2-18166",
    "2-pattal-level-2-18167",
    "2-jeets-whistle-level-2-2071",
    "2-aballof-wool-level-2-18161",
    "2-floral-hairclip-level-2-18164",
    "3-the-hoppingsocks-level-318175",
    "3-milis-hair",
    "4-ripe-mango-level-4-18182",
    "4-wheat-level-4-18184",
    "4-corn-level-4-18183",
    "4-chunniand-munni-level-4-18181",
    "4-milis-bicycle-level-4"
]

def download_barkha_pdf(identifier):
    """
    Queries the Internet Archive metadata for the identifier to resolve the real PDF filename,
    and downloads the PDF to the local storage.
    """
    pdf_path = os.path.join(PDF_DIR, f"{identifier}.pdf")
    if os.path.exists(pdf_path):
        print(f"PDF already exists for {identifier}")
        return pdf_path

    metadata_url = f"https://archive.org/metadata/{identifier}"
    try:
        print(f"Fetching metadata for {identifier}...")
        req = urllib.request.Request(metadata_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
        
        pdf_filename = None
        for f in data.get("files", []):
            name = f.get("name", "")
            if name.endswith(".pdf") and not "_jp2" in name and not "_chocr" in name:
                pdf_filename = name
                break
        
        if not pdf_filename:
            print(f"Could not find a valid PDF file in metadata for {identifier}")
            return None
        
        download_url = f"https://archive.org/download/{identifier}/{urllib.parse.quote(pdf_filename)}"
        print(f"Downloading PDF from {download_url}...")
        urllib.request.urlretrieve(download_url, pdf_path)
        print(f"Successfully downloaded {pdf_path}")
        return pdf_path
    except Exception as e:
        print(f"Failed to download PDF for {identifier}: {e}")
        return None

def clean_barkha_text(text):
    """Cleans extracted PDF text of page numbers, metadata, and excess whitespace."""
    lines = text.split("\n")
    cleaned_lines = []
    for line in lines:
        cleaned_line = line.strip()
        if not cleaned_line:
            continue
        # Filter out page numbers
        if re.match(r"^\d+$", cleaned_line):
            continue
        # Filter out common publisher header blocks
        if "Barkha Series" in cleaned_line or "NCERT" in cleaned_line or "Level-" in cleaned_line:
            continue
        cleaned_lines.append(cleaned_line)
    return " ".join(cleaned_lines)

def process_barkha_pdfs():
    """
    Downloads Barkha Series PDFs, renders pages as high-quality PNG illustrations,
    and returns parsed LangChain Documents.
    """
    documents = []
    for identifier in BARKHA_IDENTIFIERS:
        pdf_path = download_barkha_pdf(identifier)
        if not pdf_path:
            continue
        
        try:
            doc = fitz.open(pdf_path)
            book_title = identifier.split("-")[1].replace("_", " ").title() if "-" in identifier else identifier
            print(f"Extracting text and rendering pages from {book_title} PDF...")
            
            # Extract page-by-page
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                page_text = page.get_text()
                
                # Render full page as a color PNG image illustration
                try:
                    img_dir = os.path.join(IMAGE_DIR, identifier)
                    os.makedirs(img_dir, exist_ok=True)
                    target_path = os.path.join(img_dir, f"page_{page_num+1}.png")
                    
                    pix = page.get_pixmap(dpi=150)
                    pix.save(target_path)
                    illustration_path = os.path.abspath(target_path)
                except Exception as img_err:
                    illustration_path = None
                
                if page_text:
                    cleaned_text = clean_barkha_text(page_text)
                    if cleaned_text:
                        # Store in LangChain Document format with metadata tags
                        doc_obj = Document(
                            page_content=cleaned_text,
                            metadata={
                                "source": "NCERT Barkha Series",
                                "book_title": book_title,
                                "page": page_num + 1,
                                "illustration_image": illustration_path or "None",
                                "identifier": identifier,
                                "language": "english",
                                "reading_level": "Level-1" if "level-1" in identifier else ("Level-2" if "level-2" in identifier else ("Level-3" if "level-3" in identifier else "Level-4"))
                            }
                        )
                        documents.append(doc_obj)
        except Exception as e:
            print(f"Error parsing PDF {pdf_path}: {e}")
            
    return documents

def load_pratham_books():
    """Loads and chunks ALL Pratham Books from Hugging Face dataset (Aunsiels/InfantBooks)."""
    documents = []
    print("Loading ALL Aunsiels/InfantBooks dataset from Hugging Face...")
    try:
        dataset = load_dataset("Aunsiels/InfantBooks", split="train")
        print(f"Loaded {len(dataset)} books from InfantBooks. Parsing into LangChain Document formats...")
        
        # Recursive text splitter for paragraph chunking
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=200,
            chunk_overlap=30,
            separators=["\n\n", "\n", " ", ""]
        )
        
        for idx in range(len(dataset)):
            item = dataset[idx]
            title = item.get("title", f"InfantBook {idx}")
            content = item.get("content", "")
            
            # Extract raw document
            raw_doc = Document(
                page_content=content,
                metadata={
                    "source": "Pratham Books (StoryWeaver)",
                    "book_title": title,
                    "illustration_image": "None",
                    "language": "english",
                    "reading_level": "Level-1"  # Pre-school/early readers infant books
                }
            )
            
            # Split document using standard splitter
            split_docs = text_splitter.split_documents([raw_doc])
            # Inject paragraph indexing metadata
            for p_idx, split_doc in enumerate(split_docs):
                split_doc.metadata["paragraph_idx"] = p_idx + 1
                documents.append(split_doc)
                
    except Exception as e:
        print(f"Error loading Hugging Face dataset: {e}")
        
    return documents

def main():
    # 1. Gather all documents
    barkha_docs = process_barkha_pdfs()
    print(f"Processed {len(barkha_docs)} page chunks from NCERT Barkha Series.")
    
    pratham_docs = load_pratham_books()
    print(f"Processed {len(pratham_docs)} paragraph chunks from Pratham Books.")
    
    all_docs = barkha_docs + pratham_docs
    if not all_docs:
        print("No documents found. Creating a fallback offline database.")
        all_docs = [
            Document(
                page_content="Mithai was a sweet shop owner. He made tasty round laddoos every morning.",
                metadata={"source": "NCERT Barkha Series", "book_title": "Mithai", "page": 1, "illustration_image": "None"}
            ),
            Document(
                page_content="One day, a little monkey came to the shop. It saw the laddoos and wanted one.",
                metadata={"source": "NCERT Barkha Series", "book_title": "Mithai", "page": 2, "illustration_image": "None"}
            )
        ]

    # 2. Setup ChromaDB and embed documents
    print("Initializing local ChromaDB client...")
    chroma_client = chromadb.PersistentClient(path=DB_DIR)
    
    # Reset collection if exists to do a clean rebuild of full corpus
    try:
        chroma_client.delete_collection(name="kathagemma_corpus")
        print("Deleted existing database collection for clean rebuild.")
    except Exception:
        pass
        
    collection = chroma_client.get_or_create_collection(name="kathagemma_corpus")
    
    print("Loading SentenceTransformer model for embeddings...")
    embed_model = SentenceTransformer("all-MiniLM-L6-v2")
    
    print("Generating embeddings and inserting documents into ChromaDB...")
    documents_text = [d.page_content for d in all_docs]
    metadatas = [d.metadata for d in all_docs]
    ids = [f"doc_{i}" for i in range(len(all_docs))]
    
    # Embed text in batches to avoid memory overload
    batch_size = 128
    for i in range(0, len(documents_text), batch_size):
        batch_docs = documents_text[i:i+batch_size]
        batch_meta = metadatas[i:i+batch_size]
        batch_ids = ids[i:i+batch_size]
        
        batch_embeddings = embed_model.encode(batch_docs).tolist()
        
        collection.add(
            embeddings=batch_embeddings,
            documents=batch_docs,
            metadatas=batch_meta,
            ids=batch_ids
        )
        print(f"Uploaded batch {i // batch_size + 1}/{(len(documents_text)-1)//batch_size + 1}...")

    print(f"Successfully populated ChromaDB with {len(documents_text)} chunks.")

if __name__ == "__main__":
    main()
