import fs from 'fs';
import ora from 'ora';
import chalk from 'chalk';
import pkg from 'whatsapp-web.js';
import exceljs from 'exceljs';
import moment from 'moment';
import express from 'express';
import cors from 'cors';
const { Client, LegacySessionAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';

let sessionData;
let client;
const app = express();

const sendWithAPI = async (req, res) => {
    const {message, to} = req.body;
    console.log(message, to);
    const newNumber = `${to}@c.us`
    sendMessage(newNumber, message);
    res.send({status: "Enviado"});
};

app.use(cors());
app.use(express.urlencoded({ extended: true} ));
app.post('/send', sendWithAPI);

app.listen(9000, () => {
    console.log(chalk.green("Servidor corriendo en el puerto 9000"));
});

const withSession = () => {
    const spinner = ora(`${chalk.yellow("Validando session con Whatsapp...\n")}`).start();
    sessionData = JSON.parse(fs.readFileSync('./session.json', 'utf8'));
    client = new Client({
        session: sessionData,
    });
    client.on("ready", () => {
        spinner.stop();
        console.log(chalk.green("Cliente conectado con éxito"));
        listenMessage();
    })
    client.on("auth_failure", () => {
        console.error("Desvinculado!");
        spinner.stop();
    })
    client.initialize();
}

const withoutSession = () => {
    console.log("No tenemos session guardada");
    client = new Client({
        authStrategy: new LegacySessionAuth({
            session: sessionData
        })
    });
    client.on("qr", qr => {
        qrcode.generate(qr, { small: true });
    });
    client.on('authenticated', (session) => {
        sessionData = session;
        fs.writeFile("./session.json", JSON.stringify(session), (err) => {
            if (err) {
                console.error(err);
            }
        });
    });
    client.initialize();
}

const listenMessage = () => {
    client.on("message", message => {
        const { from, to, body } = message;
        console.log(chalk.yellow(from, to, body));
        switch (body) {
            case "Monopoly":
                sendMessage(from, "https://juan-chapur.github.io/monopoly-money/");
                break;
            case "Hola":
                sendMedia(from, "vsc.png")
                break;
            default:
                break;
        }
        saveHistory(from, body);
    });
}

const sendMedia = (to, file) => {
    const mediaFile = MessageMedia.fromFilePath(`./media/${file}`);
    client.sendMessage(to, mediaFile);
}

const sendMessage = (to, message) => {
    client.sendMessage(to, message);
}

const saveHistory = (number, message) => {
    const pathChat = `./chats/${number}`;
    const workbook = new exceljs.Workbook();
    const today = moment().format("YYYY-MM-DD hh:mm:ss");

    if (fs.existsSync(pathChat)) {
        workbook.xlsx.readFile(pathChat).then(() => {
            const worksheet = workbook.getWorksheet(1);
            worksheet.addRow([today, message]);
            workbook.xlsx.writeFile(pathChat);
        });
    } else {
        const worksheet = workbook.addWorksheet('Chat');
        worksheet.columns = [
            { header: 'Fecha', key: 'date'},
            { header: 'Mensaje', key: 'menssage'}
        ];
        worksheet.addRow([today, message]);
        workbook.xlsx.writeFile(pathChat).then(() => {
            console.log("Historial creado");
        })
        .catch(err => {
            console.error("Error en carga de Historial");
        });
    }
}


(fs.existsSync("./session.json")) ? withSession() : withoutSession();