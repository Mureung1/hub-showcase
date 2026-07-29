#!/bin/bash

# 시스템 패키지 설치
echo "Installing system packages (FFmpeg, Python)..."
apt-get update
apt-get install -y ffmpeg python3 python3-pip

# Node 의존성 설치
echo "Installing Node dependencies..."
cd backend
npm install

# Python 의존성 설치
echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Build complete!"
