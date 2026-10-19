@AGENTS.md

# chonk-frontend

chonk-backend(`../chonk-backend`) 의 프론트엔드. 구조와 배포는 README.md 에 정리돼 있다.

## 작업 규칙

- 대화와 코드 주석은 한국어.
- 코드는 심플하고 읽기 쉽게. 과한 추상화/라이브러리 추가보다 단순한 구조.
- API 호출은 `src/lib/api.ts` 를 통해서만 한다. 백엔드 응답 타입이 바뀌면 여기 타입도 맞춘다.
- 백엔드가 3000 포트를 쓰므로 프론트 dev 서버는 3001. 테스트용 서버는 다른 포트를 쓰고 사용자 프로세스는 끄지 않는다.

## 명령

```bash
npm run dev     # http://localhost:3001
npm run build   # 타입 체크 겸 빌드
npm run lint
```
