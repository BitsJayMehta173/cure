FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
# CPU-only PyTorch: the default wheel bundles CUDA (~2.5 GB) which a CPU host never uses.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PYTHONUNBUFFERED=1
EXPOSE 5000
CMD ["python", "ml_server.py"]
