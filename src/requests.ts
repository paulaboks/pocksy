export function redirect(path: string): Response {
	return new Response("", {
		status: 303,
		headers: { Location: path },
	})
}

export function redirect_to_origin(req: Request): Response {
	const url = new URL(req.url)
	return new Response("", {
		status: 303,
		headers: { Location: url.pathname },
	})
}
