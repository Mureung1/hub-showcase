FROM nginx:1.27-alpine

# 기본 제공되는 default.conf 를 지우고 우리 설정으로 교체한다.
# 남겨두면 우리 server 블록과 함께 로드되어 어느 쪽이 뜰지 예측하기 어려워진다.
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/chasewar.conf

# GitHub Actions 러너가 `npm run build`로 만들어둔 정적 파일.
COPY dist /usr/share/nginx/html

EXPOSE 80