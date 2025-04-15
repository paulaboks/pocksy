import { create, getNumericDate, type Payload, verify } from "djwt"

import type { CookieJar } from "./cookies.ts"

const ONE_YEAR = 60 * 60 * 24 * 365

const JWS_SECRET = Deno.env.get("JWS_SECRET")
if (JWS_SECRET == undefined) {
	throw Error("JWS_SECRET env variable not set")
}

const JWS_SECRET_TOKEN = await crypto.subtle.importKey(
	"jwk",
	{ kty: "oct", k: JWS_SECRET },
	{ name: "HMAC", hash: "SHA-512" },
	true,
	["sign", "verify"],
)

interface Token {
	expires_in: number
	access_token: string
}

export async function create_token(data: unknown): Promise<Token> {
	return {
		expires_in: ONE_YEAR,
		access_token: await create(
			{ alg: "HS512", typ: "JWT" },
			{
				exp: getNumericDate(ONE_YEAR),
				data,
				generationId: crypto.randomUUID(),
			},
			JWS_SECRET_TOKEN,
		),
	}
}

export async function verify_token(token: string): Promise<Payload> {
	return await verify(token, JWS_SECRET_TOKEN)
}

export async function login(
	cookies: CookieJar,
	user_payload: unknown,
	expires: number | string | Date,
) {
	const jwt_token = await create_token(user_payload)

	cookies.set({
		name: "authorization",
		value: `Bearer ${jwt_token.access_token}`,
		expires: expires,
	})
}

export function logout(cookies: CookieJar) {
	cookies.delete("authorization")
}
