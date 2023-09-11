//Various time and date functions for automated time-range settings
//for SaaS/Azure data calls

const cleanInput = (input) => {
    let output = input;
    if(output < 1) {
        output = 1;
    }
    output = Math.round(output);
    return output;
}

let now = () => { 
    let timeValue = new Date(); 
    return timeValue;
};

const minutesAgo = (minutes) => {
    minutes = cleanInput(minutes);
    let timeValue = new Date(now().getTime() - minutes * 60 * 1000);
    return timeValue;
}

const hoursAgo = (hours) => {
    hours = cleanInput(hours);
    let timeValue = new Date(now().getTime() - hours * 60 * 60 * 1000);
    return timeValue;
}

const daysAgo = (days) => {
    days = cleanInput(days);
    let timeValue = new Date(now().getTime() - (days*24) * 60 * 60 * 1000);
    return timeValue;
}

const weeksAgo = (weeks) => {
    weeks = cleanInput(weeks);
    let timeValue = new Date(now().getTime() - (weeks *7) * 24 * 60 * 60 * 1000);
    return timeValue;
}

module.exports = {now, minutesAgo, hoursAgo, daysAgo, weeksAgo};
