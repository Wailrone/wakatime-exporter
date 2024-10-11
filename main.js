const mysql = require("mysql2");
require('dotenv').config()

async function requestWakatime(url) {
    return await (await fetch(url, {
        headers: {
            Authorization: `Basic ${process.env.WAKATIME_TOKEN}`,
        },
    })).json()
}

const database = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME
});

setInterval(async () => {
    const currentDate = new Date()?.toISOString()?.split("T")?.[0] ?? "2000-01-01";
    const projects = await requestWakatime("https://wakatime.com/api/v1/users/current/projects");
    for (const project of projects?.data) {

        // Get projects
        database.query(`INSERT INTO projects (name, id)
                        VALUES (?, ?) ON DUPLICATE KEY
        UPDATE name =?`, [
            project.name,
            project.id,
            project.name
        ])

        // Get daily data
        const response = await requestWakatime(`https://wakatime.com/api/v1/users/current/durations?${new URLSearchParams({
            "date": currentDate,
            "project": project.name
        })}`);

        if (!response?.data) continue;

        // Regroup daily data by branches, files and languages
        const data = {};
        response?.data?.forEach((element) => {
            // Regroup branches
            if (!data[element.branch]) data[element.branch] = {
                duration: 0,
                type: "BRANCH"
            };
            data[element.branch].duration += element.duration;

            // Regroup files
            if (!data[element.entity]) data[element.entity] = {
                duration: 0,
                type: new RegExp(/https?:\/\//).test(element.entity) ? "URL" : "FILE"
            };
            data[element.entity].duration += element.duration;

            // Regroup languages
            if (!data[element.language]) data[element.language] = {
                duration: 0,
                type: "LANGUAGE"
            };
            data[element.language].duration += element.duration;
        });

        // Insert daily data
        Object.entries(data).forEach(([entityLabel, entityData]) => {
            if (!entityData.duration || !entityData.type || !entityLabel) return;
            database.query(`INSERT INTO durations (day, label, project_id, duration, type)
                            VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY
            UPDATE duration = ?;`, [
                currentDate,
                entityLabel,
                project.id,
                entityData.duration,
                entityData.type,
                entityData.duration
            ]);
        })
    }
}, 10000);

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);