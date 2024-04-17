from fastapi import FastAPI, Request, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from langchain_community.llms import LlamaCpp
from llama_cpp import Llama
import json
import asyncio
from fastapi.responses import StreamingResponse
from queue import Queue
import datetime
from RAG import get_compressed_docs
from RAG import doc_retrieval


app = FastAPI(
    title="Inference API for Local LLMs",
    description="A simple API to stream response using LLamaCPP models",
    version="1.0",
)


def llm_model(model_path, n_gpu_layers, temperature, n_ctx):
    # st_callback = StreamlitCallbackHandler(st.container())

    llm = LlamaCpp(
        model_path=model_path,
        n_gpu_layers=n_gpu_layers,
        n_batch=512,
        n_ctx=n_ctx,
        f16_kv=True,
        # callback_manager=st_callback,
        verbose=True,
        top_p=0.75,
        top_k=40,
        repeat_penalty=1.1,
        temperature=temperature,
    )
    return llm


llm_settings = {
    "model_path": "/Users/yaswanthpulavarthi/Works/llm_models/phi-2.Q4_K_M.gguf",
    "n_gpu_layers": 40,
    "temperature": 0.0,
    "n_ctx": 2048,
}

# # caching LLM
# @lru_cache(maxsize=100)
# def get_cached_llm():
#         chat = build_llm(model_path)
#         return chat

model = llm_model(**llm_settings)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from pydantic import BaseModel

# Creating a Streamer queue
streamer_queue = Queue()


class InputData(BaseModel):
    prompt: str


@app.get("/")
async def root():
    return {"message": "Try it!"}


async def stream_tokens(query):
    async for chunk in model.astream(
        query,
        max_tokens=50,
        echo=True,  # config=cfg):
        # stop=["Q:", "\n"],
        # do_sample=True,
    ):
        yield f"{chunk}"
        await asyncio.sleep(0.001)


@app.get("/stream")
async def stream(
    query: str,
    template: str,
    request: Request,
    filename: str = "",
):
    async def response_generator(template):
        template = template.replace("{{query}}", query)
        if "{{rag}}" in template:
            if filename != "undefined":
                vectordb = doc_retrieval(filename)
                retrieved_chunk = get_compressed_docs(vectordb, query)
                template = template.replace("{{rag}}", str(retrieved_chunk))
        print(template)
        async for message in stream_tokens(template):
            if await request.is_disconnected():
                break
            yield message

    return StreamingResponse(
        response_generator(template), media_type="text/event-stream"
    )


@app.post("/upload-file/")
def upload(file: UploadFile = File(...)):
    try:
        print(file)
        now = datetime.datetime.now()
        now_number = now.timestamp()

        with open(f"files/{str(now_number)}_{file.filename}", "wb") as f:
            while contents := file.file.read(1024 * 1024):
                f.write(contents)
    except Exception:
        return {"message": "There was an error uploading the file"}
    finally:
        file.file.close()

    return {
        "message": f"Successfully uploaded {file.filename}",
        "filename": str(now_number) + "_" + file.filename,
    }


if __name__ == "__main__":

    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=5000)
# curl -X POST -H "Content-Type: application/json" -d '{"prompt": "Foo"}' http://127.0.0.1:8000/predict/
