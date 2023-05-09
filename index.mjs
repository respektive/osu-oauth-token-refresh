import { refreshToken } from "./oauth.js"

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function main() {
    // init()

    // sleep(5000)

    refreshToken()

    setInterval(refreshToken, 5 * 60 * 1000)
}

main()