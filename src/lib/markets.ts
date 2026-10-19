// 랜딩페이지 마켓 카드 데이터. 백엔드에 마켓 API 가 생기기 전까지 쓰는 임시 데이터

/** 질문 하나에 선택지 여러 개(각각 Yes/No) */
type MultiMarket = {
  kind: "multi";
  id: string;
  icon: string;
  title: string;
  options: string[];
  volume: string;
  isNew?: boolean;
};

/** 두 편 중 하나를 고르는 마켓 (Up/Down, 경기 승패 등). icon 이 "churu" 면 츄르 그림을 쓴다 */
type BinaryMarket = {
  kind: "binary";
  id: string;
  icon: string;
  title: string;
  sides: [string, string];
  /** 각 버튼을 누르면 띄울 메시지 (없으면 아무 일도 없음) */
  alerts?: [string, string];
  volume: string;
  live?: boolean;
  isNew?: boolean;
};

/** 두 팀 경기 */
type MatchMarket = {
  kind: "match";
  id: string;
  teams: [Team, Team];
  status: string;
  volume: string;
  league: string;
  live?: boolean;
};

/** 게임 입장 카드 (아이콘은 이더리움 로고 고정) */
type GameMarket = {
  kind: "game";
  id: string;
  title: string;
  description: string;
  live?: boolean;
  isNew?: boolean;
};

type Team = { name: string; short: string; color: string };

export type Market = MultiMarket | BinaryMarket | MatchMarket | GameMarket;

export const MARKETS: Market[] = [
  {
    kind: "game",
    id: "1",
    title: "이더리움 새 블록 해시값 맞추기",
    description: "새로 생성될 이더리움 블록의 해시값을 맞혀보세요",
    live: true,
  },
  {
    kind: "binary",
    id: "12",
    icon: "🐱",
    title: "Chonk 고양이 이번 주 몸무게 늘까?",
    sides: ["늘어요", "그대로"],
    alerts: ["ㅋㅋㅋ", "땡! 틀렸습니다. Chonk 는 오늘도 츄르를 먹었어요 🐟"],
    volume: "N",
    isNew: true
  },
  {
    kind: "binary",
    id: "13",
    icon: "churu",
    title: "Chonk 고양이한테 츄르 주기",
    sides: ["사줄게요", "다음에요"],
    alerts: ["냥! 고마워요 😻 Chonk 가 츄르를 맛있게 먹었어요", "😾 Chonk 가 삐졌습니다..."],
    volume: "N",
    isNew: true
  },
];
