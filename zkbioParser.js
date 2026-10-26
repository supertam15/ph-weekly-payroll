const fs = require('fs');
const csv = require('csv-parser');

function parseZKBioFile(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => rows.push(data))
      .on('end', () => {
        try {
          const attendanceMap = {};

          if (rows.length === 0) return resolve({});

          const firstRow = rows[0];
          const keys = Object.keys(firstRow).map(k => k.trim().toLowerCase());

          // Check if file is a summary report
          const isSummary = keys.some(k => k.includes('work') || k.includes('overtime') || k.includes('total'));

          if (isSummary) {
            rows.forEach(row => {
              const empIdKey = Object.keys(row).find(k => /id|no|code/i.test(k));
              const hoursKey = Object.keys(row).find(k => /work.*hr|total.*hr|hours/i.test(k));
              const otKey = Object.keys(row).find(k => /ot|overtime/i.test(k));
              const lateKey = Object.keys(row).find(k => /late|tardy/i.test(k));

              const empId = row[empIdKey]?.trim();
              if (!empId) return;

              attendanceMap[empId] = {
                regularHours: parseFloat(row[hoursKey]) || 40,
                otHours: parseFloat(row[otKey]) || 0,
                lateMinutes: parseFloat(row[lateKey]) || 0
              };
            });
          } else {
            // Raw punch logs: User ID, Punch Time
            const empIdKey = Object.keys(firstRow).find(k => /user.*id|emp.*id|pin/i.test(k)) || 'User ID';
            const timeKey = Object.keys(firstRow).find(k => /time|date/i.test(k)) || 'Time';

            const userPunches = {};
            rows.forEach(row => {
              const empId = row[empIdKey]?.trim();
              const punchTime = new Date(row[timeKey]);
              if (!empId || isNaN(punchTime)) return;

              if (!userPunches[empId]) userPunches[empId] = [];
              userPunches[empId].push(punchTime);
            });

            // Calculate hours worked per user assuming pairs of In & Out per day
            Object.keys(userPunches).forEach(empId => {
              const punches = userPunches[empId].sort((a, b) => a - b);
              let totalMs = 0;
              for (let i = 0; i < punches.length - 1; i += 2) {
                totalMs += (punches[i + 1] - punches[i]);
              }
              const totalHours = totalMs / (1000 * 60 * 60);
              const regularHours = Math.min(totalHours, 40);
              const otHours = Math.max(0, totalHours - 40);

              attendanceMap[empId] = {
                regularHours: Number(regularHours.toFixed(2)),
                otHours: Number(otHours.toFixed(2)),
                lateMinutes: 0
              };
            });
          }

          resolve(attendanceMap);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', (err) => reject(err));
  });
}

module.exports = { parseZKBioFile };