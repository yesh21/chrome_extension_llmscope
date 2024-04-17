import os
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import TextLoader
from langchain_community.document_loaders import Docx2txtLoader
from langchain_community.document_loaders import BSHTMLLoader


def doc_retrieval(uploaded_file_name):
    persist_directory = f"files/vectordb/{uploaded_file_name}"
    if not os.path.exists(persist_directory):
        tmp_file_path = f"files/{uploaded_file_name}"
        extension_type = uploaded_file_name.split(".")[-1].lower()

        if os.path.exists(tmp_file_path):

            if extension_type == "pdf":
                loader = PyMuPDFLoader(file_path=tmp_file_path)
                data = loader.load()

            if extension_type == "txt":
                data = TextLoader(file_path=tmp_file_path).load()

            if extension_type == "docx":
                data = Docx2txtLoader(file_path=tmp_file_path).load()

            if extension_type == "html":
                data = BSHTMLLoader(file_path=tmp_file_path).load()

            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=256, chunk_overlap=32
            )

            splits = text_splitter.split_documents(data)

            embeddings = HuggingFaceEmbeddings()

            vectordb = FAISS.from_documents(splits, embeddings)

            vectordb.save_local(f"files/vectordb/{uploaded_file_name}")

    else:
        embeddings = HuggingFaceEmbeddings()
        vectordb = FAISS.load_local(
            f"files/vectordb/{uploaded_file_name}",
            embeddings,
            allow_dangerous_deserialization=True,
        )

    return vectordb


def get_compressed_docs(vectordb, query):

    compressed_docs = vectordb.similarity_search(query, k=3)

    return compressed_docs


# Run the app
# if __name__ == "__main__":
#     vectordb = doc_retrieval("1713275222.036914_scraped_data.html")
#     # retrieved_chunk = get_compressed_docs(vectordb, query)
#     print(get_compressed_docs(vectordb, "what are llms"))
