// janky way to replace sensitive fields in postgres audit log with a synthetic token
// it writes sanitized log to stdout, array of user tokens to fd 11, and db tokens to fd 12
//
// CLI: index.js > data.csv 4> users.tokens 5> db.tokens to get the 3 files.

import fs from 'fs';
import csv from 'csv-parser';
import chalk from 'chalk';

const authorizedUserPattern = /([\d-]+) ([\d:\.]+) (\w+) \[\d+\]: \[[\d-]+\] db=([\w-]+),user=([\w-]+) LOG:  connection authorized:/;
let userTokens = [];
let dbTokens = [];
fs.createReadStream('raw_data.csv')
    .pipe(csv())
    .on('data', (data) => {
        const match = data.textPayload.match(authorizedUserPattern);
        if (match) {
            let [_, date, time, tz, database, user] = match;

            // those are toy tokens - it's index of array that holds the sensitive values. The operator returns the index if it exists, or pushes new value to the array than returns (length - 1) which is index of the newly inserted value.
            user = `user_${userTokens.indexOf(user) !== -1 ? userTokens.indexOf(user) : userTokens.push(user) - 1}`;
            database = `db_${dbTokens.indexOf(database) !== -1 ? dbTokens.indexOf(database) : dbTokens.push(database) - 1}`;

            console.log(`${date}, ${time}, ${tz}, ${database}, ${user}`)
        } else {
            console.log(chalk.red(`Review - line has no regex match: ${data.textPayload}`));
        }
    })
    .on('end', () => {
        fs.writeSync(4, userTokens.join('\n'));
        fs.writeSync(5, dbTokens.join('\n'));
    });
