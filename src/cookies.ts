// From https://jsr.io/@juji/simple-cookie (MIT license)
export interface Cookie {
	name: string
	value: string
	expires?: string | number | Date | boolean | undefined
	path?: string | undefined
	domain?: string | undefined
	httponly?: boolean | undefined
	secure?: boolean | undefined
	samesite?: string | undefined
}

export class CookieJar {
	#cookies: Map<string, Cookie> = new Map()
	#cookies_to_set: string[] = []

	get(cookie_name: string): Cookie | undefined {
		return this.#cookies.get(cookie_name)
	}

	set(cookie: Cookie, set_on_header: boolean = true) {
		this.#cookies.set(cookie.name, cookie)
		if (set_on_header) {
			this.#cookies_to_set.push(cookie.name)
		}
	}

	delete(cookie_name: string) {
		if (!this.#cookies.has(cookie_name)) {
			throw Error(
				`Cookie ${cookie_name} can't be deleted because it's not in the jar`,
			)
		}
		// Set expires to 1 to delete (01 Jan 1970)
		this.#cookies.set(cookie_name, {
			name: cookie_name,
			value: "",
			expires: 1,
		})
		this.#cookies_to_set.push(cookie_name)
	}

	append_into_header(header: Headers) {
		for (const cookie of this.#cookies) {
			if (this.#cookies_to_set.includes(cookie[0])) {
				header.append("set-cookie", stringify(cookie[1]))
			}
		}
	}

	static from_string(cookies_input: string | null): CookieJar {
		const jar = new CookieJar()
		if (cookies_input == null) {
			return jar
		}

		const cookies_to_parse = cookies_input.split(";")
		for (const cookie_to_parse of cookies_to_parse) {
			const cookie = parse(cookie_to_parse.trim())
			jar.set(cookie, false)
		}

		return jar
	}
}

function print_expires(
	expires: string | number | boolean | Date,
): string | false {
	if (!expires) {
		return false
	}

	let date = new Date()

	if (typeof expires == "string" || typeof expires == "number") {
		date = new Date(expires)
	}

	return "Expires=" + date.toUTCString() + ";Max-Age=" +
		Math.round((date.valueOf() - new Date().valueOf()) / 1000)
}

function stringify(cookie: Cookie): string {
	let value
	try {
		value = encodeURIComponent(cookie.value)
	} catch (_) {
		value = cookie.value
	}

	return [
		cookie.name + "=" + value,
		cookie.expires != undefined ? print_expires(cookie.expires) : "",
		cookie.path != undefined ? `Path=${cookie.path}` : "Path=/",
		cookie.domain != undefined ? `Domain=${cookie.domain}` : "",
		cookie.secure != undefined ? "secure" : "",
		cookie.httponly != undefined ? "HttpOnly" : "",
		cookie.samesite != undefined ? `SameSite=${cookie.samesite}` : "",
	]
		.join(";") // Join cookie parts with ;
		.replace(/;+/g, ";") // Replace repeated semicolons with a single one (;;; -> ;)
		.replace(/;$/, "") // Remove the last semicolon
		.replace(/;/g, "; ") // Add space after semicolon (pretty)
}

function parse(
	string: string,
	path: string = "/",
	domain: string = "",
): Cookie {
	const [name, value, ...rest] = string.split("=")

	// If no name, no value or if there is a rest
	if (!name || !value || rest.length > 0) {
		throw new Error("malformed cookie")
	}

	const cookie: Cookie = {
		name: name,
		value: value,
		path: path,
		domain: domain,
	}

	return cookie
}
