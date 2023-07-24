## blind-chat
블라인드 챗: 익명성 의견 수집기

### 실행
```bash
# node v16.15.1
npm install
npm run dev
```

### 폴더구조
```bash
blind-chat
├── public # 빌드 경로
├── src
│   ├── assets # 콘텐츠 리소스 폴더(font,image,scss)
│   ├── components # 컴포넌트 항목
│   │   ├── Comments.svelte
│   │   ├── InputForm.svelte
│   │   └── Modal.svelte
│   ├── App.svelte # app 시작점
│   └── main.js
└── index.html
```