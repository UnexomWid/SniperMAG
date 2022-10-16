import nodemailer from 'nodemailer';
import eryn from './eryn.js'

var transporter;

export default {
    init: (config) => {
        transporter = nodemailer.createTransport({
            host: config.email.host,
            port: config.email.port,
            secure: config.email.secure,
            auth: {
                user: config.email.user,
                pass: config.email.pass
            }
        });
    },
    send: async (config, view, context, recipients) => {
        if (!recipients) {
            return Promise.resolve();
        }

        const subject = eryn.render(view, { ...context, type: 'subject' }, {}).toString();
        const text = eryn.render(view, { ...context, type: 'text' }, {}).toString();
        const html = eryn.render(view, { ...context, type: 'html' }, {}).toString();

        return new Promise((resolve, reject) => {
            transporter.sendMail({
                from: {
                    name: config.email.name,
                    address: config.email.address
                },
                to: [recipients],
                subject,
                text,
                html,
            }, (err, info, _) => {
                if(err) {
                    reject(`Failed to send email\n${err}`);
                } else if(info.rejected.length > 0) {
                    reject(`Mail rejected (${recipient})`);
                }

                resolve();
            });
        });
    }
}