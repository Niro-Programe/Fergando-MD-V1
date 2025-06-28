const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  getContentType,
  fetchLatestBaileysVersion,
  Browsers,
  generatePairingCode // නවතම අනුවාදයේ ඇතුළත් වේ
} = require('@whiskeysockets/baileys')

const { getBuffer, getGroupAdmins, getRandom /*...අනෙකුත් imports...*/ } = require('./lib/functions')
const fs = require('fs')
const P = require('pino')
const config = require('./config')
const express = require("express")
const app = express()
const port = process.env.PORT || 8000

const ownerNumber = '94741984208' // ඔබගේ අංකය යොදන්න

async function connectToWA() {
  console.log("NADEEN-MD BOT Starting...")
  
  // Session storage
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys')
  const { version } = await fetchLatestBaileysVersion()

  const conn = makeWASocket({
    logger: P({ level: 'silent' }),
    printQRInTerminal: false, // QR අක්‍රීය කර ඇත
    browser: Browsers.macOS("Firefox"),
    auth: state,
    version
  })

  conn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update

    // Pairing Code ජනනය කිරීම
    if (update.qr) {
      const pairingCode = await generatePairingCode(conn)
      console.log('Pairing Code:', pairingCode)
      
      // අයිතිකරුට Pairing Code එක යැවීම
      await conn.sendMessage(
        ownerNumber + '@s.whatsapp.net', 
        { 
          text: `🔢 *NADEEN-MD Pairing Code:* ${pairingCode}\n\n` +
                `_WhatsApp > Settings > Linked Devices > Link a Device > Pair with code_\n` +
                `_මෙම කේතය 20 තත්පර ඇතුළත භාවිතා කරන්න_`
        }
      )
    }

    if (connection === 'close') {
      if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
        console.log('Reconnecting...')
        setTimeout(connectToWA, 5000)
      }
    } else if (connection === 'open') {
      console.log('✅ Successfully connected!')
      
      // Plugins load කිරීම
      const path = require('path')
      fs.readdirSync("./plugins/").forEach((plugin) => {
        if (path.extname(plugin).toLowerCase() === ".js") {
          require("./plugins/" + plugin)
        }
      })

      await conn.sendMessage(
        ownerNumber + '@s.whatsapp.net',
        { text: '🚀 *NADEEN-MD* Pairing successful! Bot is now ready.' }
      )
    }
  })

  conn.ev.on('creds.update', saveCreds)

  // ...ඔබගේ පවතින message handling කේතය යොදන්න...
}

// Server start
app.get("/", (req, res) => res.send("NADEEN-MD Pairing System Active"))
app.listen(port, () => console.log(`Server running on port ${port}`))

// Start connection
connectToWA()
