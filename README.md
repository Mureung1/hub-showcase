# hub

## 이미지 저장 및 AI 분류

- 지원 형식: JPEG, PNG, WebP
- 최대 크기: 5MB
- 이미지는 브라우저에서 `multipart/form-data`로 Express에 전송된다.
- Express는 이미지를 메모리에서 Gemini inline data로 전달하고, 분류 후 Supabase
  Storage에 업로드한다. 이미지 원본이나 Base64 데이터는 DB에 저장하지 않는다.
- Gemini 이미지 분류가 실패하면 함께 입력된 텍스트에 기존 규칙을 적용한다. 텍스트
  규칙도 일치하지 않거나 이미지 단독 요청이면 `미분류 / null`로 저장한다.

### Supabase 설정

`supabase/migrations/202607230001_add_item_images.sql`을 적용하면 원문 보존용
`items.content`, 이미지 URL용 `items.image_url`, public `later-images` 버킷이
생성된다. 버킷은 JPEG, PNG, WebP와 5MB 제한을 사용한다. 서버 환경변수에는 다음
값을 설정한다.

```env
SUPABASE_STORAGE_BUCKET=later-images
```

다른 버킷명을 사용할 경우 같은 공개 접근, MIME type, 크기 제한을 별도로 설정해야
한다. 업로드는 서버의 `SUPABASE_SERVICE_ROLE_KEY`로 수행한다.
