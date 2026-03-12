const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    function convertToSeconds(time) {
        let parts = time.split(" ");
        let clock = parts[0].split(":");
        let period = parts[1];

        let hours = Number(clock[0]);
        let minutes = Number(clock[1]);
        let seconds = Number(clock[2]);

        if (period === "am" && hours === 12) {
            hours = 0;
        }
        if (period === "pm" && hours !== 12) {
            hours = hours + 12;
        }

        return hours * 3600 + minutes * 60 + seconds;
    }

    let start = convertToSeconds(startTime);
    let end = convertToSeconds(endTime);

    if (end < start) {
        end = end + 24 * 3600;
    }

    let total = end - start;

    let hours = Math.floor(total / 3600);
    total = total % 3600;

    let minutes = Math.floor(total / 60);
    let seconds = total % 60;

    if (minutes < 10) {
        minutes = "0" + minutes;
    }
    if (seconds < 10) {
        seconds = "0" + seconds;
    }

    return hours + ":" + minutes + ":" + seconds;

}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {

    function convert(time) {
        let parts = time.split(" ");
        let clock = parts[0].split(":");
        let period = parts[1];

        let h = Number(clock[0]);
        let m = Number(clock[1]);
        let s = Number(clock[2]);

        if (period === "am" && h === 12) h = 0;
        if (period === "pm" && h !== 12) h = h + 12;

        return h*3600 + m*60 + s;
    }

    let start = convert(startTime);
    let end = convert(endTime);

    if (end < start) {
        end = end + 24*3600;
    }

    let open = 8 * 3600;
    let close = 22 * 3600;

    let idle = 0;

    if (start < open) {
        idle += Math.min(end, open) - start;
    }

    if (end > close) {
        idle += end - Math.max(start, close);
    }

    let h = Math.floor(idle / 3600);
    idle = idle % 3600;
    let m = Math.floor(idle / 60);
    let s = idle % 60;

    if (m < 10) m = "0" + m;
    if (s < 10) s = "0" + s;

    return h + ":" + m + ":" + s;
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    let shiftParts = shiftDuration.split(":");
    let idleParts = idleTime.split(":");

    let shiftSeconds = Number(shiftParts[0]) * 3600
        + Number(shiftParts[1]) * 60
        + Number(shiftParts[2]);

    let idleSeconds = Number(idleParts[0]) * 3600
        + Number(idleParts[1]) * 60
        + Number(idleParts[2]);

    let activeSeconds = shiftSeconds - idleSeconds;

    if (activeSeconds < 0) {
        activeSeconds = 0;
    }

    let hours = Math.floor(activeSeconds / 3600);
    activeSeconds = activeSeconds % 3600;

    let minutes = Math.floor(activeSeconds / 60);
    let seconds = activeSeconds % 60;

    if (minutes < 10) {
        minutes = "0" + minutes;
    }

    if (seconds < 10) {
        seconds = "0" + seconds;
    }

    return hours + ":" + minutes + ":" + seconds;
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    let parts = activeTime.split(":");
    let hours = Number(parts[0]);
    let minutes = Number(parts[1]);
    let seconds = Number(parts[2]);

    let totalSeconds = hours * 3600 + minutes * 60 + seconds;

    let neededSeconds = 8 * 3600 + 24 * 60;

    if (date >= "2025-04-10" && date <= "2025-04-30") {
        neededSeconds = 6 * 3600;
    }

    if (totalSeconds >= neededSeconds) {
        return true;
    } else {
        return false;
    }
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    let fileData = fs.readFileSync(textFile, { encoding: "utf8" });
    let lines = fileData.trim().split("\n");

    let driverID = shiftObj.driverID;
    let driverName = shiftObj.driverName;
    let date = shiftObj.date;
    let startTime = shiftObj.startTime;
    let endTime = shiftObj.endTime;

    // check duplicate
    for (let i = 1; i < lines.length; i++) {
        let parts = lines[i].split(",");
        if (parts[0] === driverID && parts[2] === date) {
            return {};
        }
    }

    let shiftDuration = getShiftDuration(startTime, endTime);
    let idleTime = getIdleTime(startTime, endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let quota = metQuota(date, activeTime);
    let hasBonus = false;

    let newObj = {
        driverID: driverID,
        driverName: driverName,
        date: date,
        startTime: startTime,
        endTime: endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: quota,
        hasBonus: hasBonus
    };

    let newLine = driverID + "," + driverName + "," + date + "," + startTime + "," + endTime + "," +
                  shiftDuration + "," + idleTime + "," + activeTime + "," + quota + "," + hasBonus;

    let insertIndex = lines.length;
    let foundDriver = false;

    for (let i = 1; i < lines.length; i++) {
        let parts = lines[i].split(",");
        if (parts[0] === driverID) {
            insertIndex = i + 1;
            foundDriver = true;
        }
    }

    if (foundDriver) {
        lines.splice(insertIndex, 0, newLine);
    } else {
        lines.push(newLine);
    }

    fs.writeFileSync(textFile, lines.join("\n"), { encoding: "utf8" });

    return newObj;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    let data = fs.readFileSync(textFile, "utf8");
    let lines = data.trim().split("\n");

    for (let i = 1; i < lines.length; i++) {
        let parts = lines[i].split(",");

        if (parts[0] === driverID && parts[2] === date) {
            parts[9] = String(newValue);
            lines[i] = parts.join(",");
        }
    }

    fs.writeFileSync(textFile, lines.join("\n"), "utf8");
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    let data = fs.readFileSync(textFile, "utf8");
    let lines = data.trim().split("\n");

    let count = 0;
    let found = false;

    month = String(month);
    if (month.length === 1) {
        month = "0" + month;
    }

    for (let i = 1; i < lines.length; i++) {
        let parts = lines[i].split(",");

        let id = parts[0];
        let date = parts[2];
        let bonus = parts[9].trim();

        if (id === driverID) {
            found = true;

            let dateParts = date.split("-");
            let recordMonth = dateParts[1];

            if (recordMonth === month && bonus === "true") {
                count++;
            }
        }
    }

    if (found === false) {
        return -1;
    }

    return count;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    let data = fs.readFileSync(textFile, "utf8");
    let lines = data.trim().split("\n");

    let totalSeconds = 0;

    for (let i = 1; i < lines.length; i++) {
        let parts = lines[i].split(",");

        let id = parts[0];
        let date = parts[2];
        let activeTime = parts[7];

        let dateParts = date.split("-");
        let recordMonth = Number(dateParts[1]);

        if (id === driverID && recordMonth === month) {
            let timeParts = activeTime.split(":");
            let h = Number(timeParts[0]);
            let m = Number(timeParts[1]);
            let s = Number(timeParts[2]);

            totalSeconds = totalSeconds + h * 3600 + m * 60 + s;
        }
    }

    let hours = Math.floor(totalSeconds / 3600);
    totalSeconds = totalSeconds % 3600;
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;

    if (minutes < 10) {
        minutes = "0" + minutes;
    }

    if (seconds < 10) {
        seconds = "0" + seconds;
    }

    return hours + ":" + minutes + ":" + seconds;
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    let rateData = fs.readFileSync(rateFile, "utf8").trim().split("\n");
    let dayOff = "";

    for (let i = 0; i < rateData.length; i++) {
        let parts = rateData[i].split(",");
        if (parts[0] === driverID) {
            dayOff = parts[1].trim();
        }
    }

    let fileData = fs.readFileSync(textFile, "utf8").trim().split("\n");
    let totalSeconds = 0;

    for (let i = 1; i < fileData.length; i++) {
        let parts = fileData[i].split(",");
        let id = parts[0];
        let date = parts[2];

        let dateParts = date.split("-");
        let recordMonth = Number(dateParts[1]);

        if (id === driverID && recordMonth === month) {
            let dayName = new Date(date).toLocaleDateString("en-US", { weekday: "long" });

            if (dayName !== dayOff) {
                if (date >= "2025-04-10" && date <= "2025-04-30") {
                    totalSeconds = totalSeconds + 6 * 3600;
                } else {
                    totalSeconds = totalSeconds + 8 * 3600 + 24 * 60;
                }
            }
        }
    }

    totalSeconds = totalSeconds - (bonusCount * 2 * 3600);

    if (totalSeconds < 0) {
        totalSeconds = 0;
    }

    let hours = Math.floor(totalSeconds / 3600);
    totalSeconds = totalSeconds % 3600;
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;

    if (minutes < 10) {
        minutes = "0" + minutes;
    }
    if (seconds < 10) {
        seconds = "0" + seconds;
    }

    return hours + ":" + minutes + ":" + seconds;
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    let data = fs.readFileSync(rateFile, "utf8").trim().split("\n");

    let basePay = 0;
    let tier = 0;

    for (let i = 0; i < data.length; i++) {
        let parts = data[i].split(",");

        if (parts[0] === driverID) {
            basePay = Number(parts[2]);
            tier = Number(parts[3]);
        }
    }

    function toSeconds(time) {
        let parts = time.split(":");
        let h = Number(parts[0]);
        let m = Number(parts[1]);
        let s = Number(parts[2]);

        return h * 3600 + m * 60 + s;
    }

    let actual = toSeconds(actualHours);
    let required = toSeconds(requiredHours);

    if (actual >= required) {
        return basePay;
    }

    let allowedHours = 0;

    if (tier === 1) {
        allowedHours = 50;
    } else if (tier === 2) {
        allowedHours = 20;
    } else if (tier === 3) {
        allowedHours = 10;
    } else if (tier === 4) {
        allowedHours = 3;
    }

    let missingSeconds = required - actual;
    missingSeconds = missingSeconds - (allowedHours * 3600);

    if (missingSeconds < 0) {
        missingSeconds = 0;
    }

    let missingHours = Math.floor(missingSeconds / 3600);
    let deductionRatePerHour = Math.floor(basePay / 185);
    let salaryDeduction = missingHours * deductionRatePerHour;
    let netPay = basePay - salaryDeduction;

    return netPay;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
