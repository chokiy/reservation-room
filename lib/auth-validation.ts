// 가입·로그인 입력 검증 (순수 함수). 서버 액션과 단위 테스트가 함께 쓴다.

export const NEW_TEAM_VALUE = "__new__";

export const PASSWORD_MIN_LENGTH = 8;
export const NICKNAME_MAX_LENGTH = 20;
export const TEAM_NAME_MAX_LENGTH = 30; // teams_name_length 제약(1~30)과 같다

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldErrors = Partial<
  Record<"email" | "password" | "nickname" | "team" | "newTeamName", string>
>;

export type LoginInput = { email: string; password: string };

export type SignupInput = {
  email: string;
  password: string;
  nickname: string;
  /** 팀 select 값: 기존 팀 id 문자열 또는 NEW_TEAM_VALUE */
  team: string;
  newTeamName: string;
};

/** 가입 metadata로 넘길 팀 정보. 기존 팀이면 teamId, 새 팀이면 teamName. */
export type SignupData = {
  email: string;
  password: string;
  nickname: string;
  teamId?: number;
  teamName?: string;
};

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: FieldErrors };

function validateEmail(email: string): string | undefined {
  if (!email) return "이메일을 입력하세요.";
  if (!EMAIL_PATTERN.test(email)) return "이메일 형식이 올바르지 않습니다.";
}

export function validateLogin(input: LoginInput): ValidationResult<LoginInput> {
  const email = input.email.trim();
  const errors: FieldErrors = {};

  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (!input.password) errors.password = "비밀번호를 입력하세요.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { email, password: input.password } };
}

export function validateSignup(input: SignupInput): ValidationResult<SignupData> {
  const email = input.email.trim();
  const nickname = input.nickname.trim();
  const errors: FieldErrors = {};

  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;

  if (input.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`;
  }

  if (!nickname) {
    errors.nickname = "닉네임을 입력하세요.";
  } else if (nickname.length > NICKNAME_MAX_LENGTH) {
    errors.nickname = `닉네임은 ${NICKNAME_MAX_LENGTH}자 이하로 입력하세요.`;
  }

  let teamId: number | undefined;
  let teamName: string | undefined;
  if (input.team === NEW_TEAM_VALUE) {
    teamName = input.newTeamName.trim();
    if (!teamName) {
      errors.newTeamName = "새 팀 이름을 입력하세요.";
    } else if (teamName.length > TEAM_NAME_MAX_LENGTH) {
      errors.newTeamName = `팀 이름은 ${TEAM_NAME_MAX_LENGTH}자 이하로 입력하세요.`;
    }
  } else if (/^\d+$/.test(input.team)) {
    teamId = Number(input.team);
  } else {
    errors.team = "팀을 선택하세요.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      email,
      password: input.password,
      nickname,
      ...(teamId !== undefined ? { teamId } : { teamName }),
    },
  };
}
