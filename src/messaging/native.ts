import { rejectPromise, resolvePromise } from "../messaging"
import { NativeRequest } from "../types"
import { keepPromise } from "./promises"

let globalPort: browser.runtime.Port = undefined

type RawNativeResponse = {
	id?: string
	data?: any
	error?: number
}

function getNativePort(): browser.runtime.Port {
	if (globalPort != undefined && globalPort.error == null) return globalPort

	const newPort = browser.runtime.connectNative("io.github.kuba2k2.webserial")
	if (newPort.error != null) throw newPort.error

	newPort.onMessage.addListener(async (message: RawNativeResponse) => {
		// console.log(" <- NATIVE/IO:", message)
		if (!message.id) return
		if (message.data !== undefined)
			await resolvePromise(message.id, message.data)
		if (message.error !== undefined)
			await rejectPromise(
				message.id,
				new Error(`Native error ${message.error}`)
			)
	})
	newPort.onDisconnect.addListener(() => {
		globalPort = null
	})

	globalPort = newPort
	return globalPort
}

export async function sendToNative(message: NativeRequest): Promise<any> {
	const [id, promise]: [string, Promise<any>] = keepPromise()
	const port = getNativePort()
	message.id = id
	port.postMessage(message)
	// console.log(" -> NATIVE/IO:", message)
	return await promise
}