import type { Payload } from "djwt"

import { create_token, verify_token } from "./auth.ts"
import type { CookieJar } from "./cookies.ts"

export interface State<T> {
	cookies: CookieJar
	session: Session

	data: T
}

export class Session {
	storage: Record<string, unknown> = {}
	new: boolean = false
	modified: boolean = false

	get(key: string): unknown | undefined {
		return this.storage[key]
	}

	set(key: string, value: unknown) {
		this.storage[key] = value
		this.modified = true
	}

	delete(key: string) {
		delete this.storage[key]
	}

	serialize(): string {
		return JSON.stringify(this)
	}

	static deserialize(session_string: string): Session {
		const data = JSON.parse(session_string)

		const session = new Session()
		session.storage = data.storage
		session.new = data.new
		session.modified = data.modified

		return session
	}
}

const SESSION_COOKIE_NAME = "session_jwt"

export async function set_cookie_jwt(
	state: State<unknown>,
	payload: unknown,
	cookie_name: string,
	expires: number | string | Date = 0,
) {
	const jwt_token = await create_token(payload)

	state.cookies.set({
		name: cookie_name,
		value: jwt_token.access_token,
		expires: expires,
	})
}

export async function get_cookie_jwt(
	state: State<unknown>,
	cookie_name: string,
): Promise<Payload | undefined> {
	const maybe_cookie = state.cookies.get(cookie_name)
	if (!maybe_cookie) {
		return undefined
	}
	return await verify_token(maybe_cookie.value)
}

export async function start_session(state: State<unknown>): Promise<void> {
	const maybe_cookie = state.cookies.get(SESSION_COOKIE_NAME)

	if (!maybe_cookie) {
		state.session.new = true
		await set_cookie_jwt(
			state,
			state.session.serialize(),
			SESSION_COOKIE_NAME,
		)
	} else {
		const jwt = await get_cookie_jwt(state, SESSION_COOKIE_NAME)
		if (jwt == undefined) {
			delete_session(state)
			return
		}
		state.session = Session.deserialize(jwt["data"] as string)
		state.session.new = false
	}
}

export async function save_session(state: State<unknown>): Promise<void> {
	if (state.session.modified) {
		await set_cookie_jwt(
			state,
			state.session.serialize(),
			SESSION_COOKIE_NAME,
		)
	}
}

export function delete_session(state: State<unknown>): void {
	state.cookies.delete(SESSION_COOKIE_NAME)
}
