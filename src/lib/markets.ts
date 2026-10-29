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

/** 게임 입장 카드. icon 이 "eth" 면 이더리움 코인, "churu" 면 츄르 그림, "cat" 이면 고양이 얼굴, "mouse" 면 쥐 얼굴, "dice" 면 주사위, "ladder" 면 사다리, "lottery" 면 제비 */
type GameMarket = {
  kind: "game";
  id: string;
  icon: string;
  title: string;
  description: string;
  /** 입장하기 버튼이 가는 게임 페이지 */
  href: string;
  live?: boolean;
  isNew?: boolean;
  /** 추천 게임: 카드 테두리를 살짝 강조하고 오른쪽 위에 왕관 표시 */
  best?: boolean;
  /** 카드 아래 작은 태그 (LIVE 가 아닌 카드용). 예) "⚡ 바로 결과" */
  tag?: string;
};

type Team = { name: string; short: string; color: string };

/** 버튼 하나로 무언가를 사 주는 카드. 누르면 가격을 묻고, 확인하면 thanks 를 보여준다 */
type BuyMarket = {
  kind: "buy";
  id: string;
  icon: string;
  title: string;
  button: string;
  price: number;
  thanks: string;
  isNew?: boolean;
  tag?: string;
};

/** 준비 중인 게임 자리 (? 와 Coming soon 만 보여준다) */
type SoonMarket = { kind: "soon"; id: string; title: string };

export type Market = MultiMarket | BinaryMarket | MatchMarket | GameMarket | BuyMarket | SoonMarket;

export const MARKETS: Market[] = [
  {
    kind: "game",
    id: "1",
    icon: "eth",
    title: "이더리움 블록 동전 던지기",
    description: "새 블록 해시로 던지는 동전, 앞면일까 뒷면일까?",
    href: "/games/eth-hash",
    live: true,
  },
  {
    kind: "game",
    id: "3",
    icon: "cat",
    title: "이더리움 블록 고양이 경주",
    description: "블록 해시로 달리는 고양이 4마리, 1등은 누구?",
    href: "/games/cat-race",
    live: true,
  },
  {
    kind: "game",
    id: "4",
    icon: "mouse",
    title: "이더리움 블록 그림 맞추기",
    description: "블록 해시 마지막 3글자가 그림이 돼요. 츄르 3개면 12배!",
    href: "/games/block-match",
    live: true,
  },
  {
    kind: "game",
    id: "5",
    icon: "dice",
    title: "이더리움 블록 주사위",
    description: "블록 해시로 굴리는 주사위 2개, 합이 대일까 소일까 럭키 7일까?",
    href: "/games/dice",
    live: true,
  },
  {
    kind: "game",
    id: "6",
    icon: "ladder",
    title: "이더리움 블록 사다리",
    description: "블록 해시로 그려지는 사다리, 4줄 중 당첨은 단 하나!",
    href: "/games/ladder",
    live: true,
    isNew: true,
  },
  {
    kind: "game",
    id: "7",
    icon: "lottery",
    title: "이더리움 블록 제비뽑기",
    description: "제비 16장 중 해시 마지막 글자가 당첨! 맞히면 15배",
    href: "/games/lottery",
    live: true,
    isNew: true,
    best: true,
  },
  {
    kind: "game",
    id: "2",
    icon: "churu",
    title: "랜덤 츄르 그림 맞추기",
    description: "츄르 세 개가 나란히 나오면 잭팟!",
    href: "/games/churu-match",
    tag: "⚡ 바로 결과",
  },

  {
    kind: "buy",
    id: "13",
    icon: "churu",
    title: "Chonk 고양이한테 츄르 주기",
    button: "사줄게요",
    price: 10,
    thanks: "냥! 고마워요 😻 Chonk 가 츄르를 맛있게 먹었어요",
    tag: "💝 응원하기",
  },
  { kind: "soon", id: "soon-1", title: "새 게임 준비 중" },
];
