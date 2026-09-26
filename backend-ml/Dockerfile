FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
# CPU-only PyTorch: the default wheel bundles CUDA (~2.5 GB) which a CPU host never uses.
# PyPI stays the main index (other packages & build tools); the CPU index is only an extra
# source, and its "+cpu" torch build wins over PyPI's CUDA build.
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt
COPY . .
ENV PYTHONUNBUFFERED=1
EXPOSE 5000
CMD ["python", "ml_server.py"]
