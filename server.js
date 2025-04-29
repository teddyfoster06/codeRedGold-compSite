const express = require('express');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const app = express();
const PORT = 3000;

const wss = new WebSocket.Server({port:3001});

wss.on('connection', (ws) => {
    console.log("A client connected to web socket server");
    ws.on('message', (message) => {
        const requestJSON = JSON.parse(message);
        //1. Find an open container
        let index = -1;
        for(let j = 0; j < activeRunners.length; j++){
            console.log("Testing " + activeRunners[j]);
            if(activeRunners[j] === true){
                index = checkIfOpen(j, requestJSON['problem-number']);
            }
        }
        console.log("run data object");
        console.log(runDataObjects[index]);

        //2.Create Code
        
        const code = formatCode(requestJSON['code'], requestJSON['problemNumber'], requestJSON['language']);
        console.log(code);
        //3. Send Code
        
        //4. On response, compare output to testcases
        //5. Send new testcases back to the client
    })
    ws.on('close', () =>{
        console.log('client disconnected');
    })
})

const teamsPath = path.join(__dirname, 'database', 'teams.json');
const teamDataPath = path.join(__dirname, 'database', 'teamData.json');
const problemsPath = path.join(__dirname, 'database', 'problems.json');
const compInfoPath = path.join(__dirname, 'database', 'compInfo.json');
const registeredRunnersPath = path.join(__dirname, 'database', 'registeredRunners.json');
const problemsJSON = JSON.parse(fs.readFileSync(problemsPath, 'utf8'));
const compInfoJSON = JSON.parse(fs.readFileSync(compInfoPath, 'utf8'));


// Middleware to parse JSON request bodies
app.use(express.json());



app.get('/log', (req, res) => {
    const {data} = req.query;
    console.log("Client Log:")
    console.log(data);
    res.status(200).json({});
})

app.post('/register-runner', (req, res) => {
    console.log("New Change");
    console.log("Request recieved");
    let ip = req.ip;
    if(ip.startsWith('::ffff:')){
        ip=ip.substring(7);
    }
    let runnersJSON = JSON.parse(fs.readFileSync(registeredRunnersPath, 'utf8'));
    for(let i = 0; i < runnersJSON.length; i++){
        if(runnersJSON[i] === ip){
            res.status(401).json({success: false, message: "ip already registered"});
            return;
        }
    }
    runnersJSON.push({"ip":ip});
    fs.writeFileSync(registeredRunnersPath, JSON.stringify(runnersJSON, null, 2), 'utf8')

    res.status(200).json({success: true});

})

// Serve static files (JS, CSS)
app.use(express.static('public'));

// HTML Page Route
app.get('/problem', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages/problem.html'));
});
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages/login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages/signup.html'));
});
app.get('/end-time', (req, res) => {
    res.status(200).json({endTime: compInfoJSON['end-time']});
})

app.get('/problem-description', (req, res) => {
    const {problemNumber} = req.query;
    try{
        res.status(200).json({success: true, description: problemsJSON[problemNumber-1]['problem-description'], title: problemsJSON[problemNumber-1]['problem-title'], pointValue: problemsJSON[problemNumber-1]['problem-value'], number: parseInt(problemNumber), pythonBoilerplate: problemsJSON[problemNumber-1]['boilerplate-python'], javaBoilerplate: problemsJSON[problemNumber-1]['boilerplate-java']});
    }catch(error){
        res.status(404).json({success: false});
    }
})

app.get('/problems-list', (req, res) => {
    const problemsList = [];

    for(let i = 0; i < problemsJSON.length; i++){
        problemsList.push({title: problemsJSON[i]['problem-title'], number: i+1, value: problemsJSON[i]['problem-value']})
    }
    res.status(200).json({success: true, list: problemsList});
})


app.post("/value-java", (req, res) =>{
    const {username, password, problemNumber} = req.body;
   
    let teamDataJSON = JSON.parse(fs.readFileSync(teamDataPath, 'utf8'));

    for(let i = 0; i < teamDataJSON.length; i++){
        if(teamDataJSON[i]['username'].toLowerCase() == username.toLowerCase()){
            if(teamDataJSON[i]['password'].toLowerCase() == password.toLowerCase()){
                const problemData = teamDataJSON[i]['problems'];
                res.status(200).json({ success: true, value: problemData[problemNumber-1]['value-java']});
                return;
                    
                
            }else{
                res.status(401).json({ success: false, message: 'Bad Password' });
                return;
    
            }
        }
    }

    res.status(401).json({ success: false, message: 'Username not recognized' });
    return;
});

app.post("/value-python", (req, res) =>{
    const {username, password, problemNumber} = req.body;
    console.log("Value request recieved");
    let teamDataJSON = JSON.parse(fs.readFileSync(teamDataPath, 'utf8'));

    for(let i = 0; i < teamDataJSON.length; i++){
        if(teamDataJSON[i]['username'].toLowerCase() == username.toLowerCase()){
            if(teamDataJSON[i]['password'].toLowerCase() == password.toLowerCase()){
                const problemData = teamDataJSON[i]['problems'];
                    res.status(200).json({ success: true, value: problemData[problemNumber-1]['value-python']});
                    return;
            }else{
                res.status(401).json({ success: false, message: 'Bad Password' });
                return;
    
            }
        }
    }

    res.status(401).json({ success: false, message: 'Username not recognized' });
    return;
});



app.post('/register', (req, res) => {
    const {teamName, username, password} = req.body;
    console.log(`Register request: ${teamName}, ${username}, ${password}`);

    let teamsJSON = JSON.parse(fs.readFileSync(teamsPath, 'utf8'));

    for(let i = 0; i < teamsJSON.length; i++){
        if(teamsJSON[i]['team-name'].toLowerCase() == teamName.toLowerCase()){
            res.status(401).json({ success: false, message: 'Team Name Taken' });
            console.log("Team Name Taken");
            return;
        }else if(teamsJSON[i]['username'] == username.toLowerCase()){
            res.status(402).json({ success: false, message: 'Username Taken' });
            console.log("Username Taken");
            return;
        }
    }
    const newTeamObject = {
        "team-name": teamName,
        "username": username.toLowerCase(),
        "password": password,
        "points": 0
    }


    teamsJSON.push(newTeamObject);

    fs.writeFileSync(teamsPath, JSON.stringify(teamsJSON, null, 2), 'utf8')
    

    let teamDataJSON = JSON.parse(fs.readFileSync(teamDataPath, 'utf8'));
    teamDataJSON.push({
        "username": username.toLowerCase(),
        "password": password,
        "points": 0,
        "problems":generateUserProblemsArray()
        
    })
    fs.writeFileSync(teamDataPath, JSON.stringify(teamDataJSON, null, 2), 'utf8')

    res.status(200).json({ success: true, message: 'Team Added' });

});

app.post('/testcases', (req, res) => {
    const {username, password, problemNumber} = req.body;
    console.log(`Testcase request: ${username}, ${problemNumber}`);

    let teamDataJSON = JSON.parse(fs.readFileSync(teamDataPath, 'utf8'));
    for(let i = 0; i < teamDataJSON.length; i++){
        if(teamDataJSON[i]['username'] == username){
            if(teamDataJSON[i]['password'] == password){
                const problem = teamDataJSON[i]['problems'][problemNumber-1];
                res.status(200).json({success: true, testcases: problem['testcases'], message: 'Testcases sent'});
                return;
            }else{
                res.status(401).json({success: false, message: 'Bad Password'});
                return;
            }
        }
    }

    res.status(401).json({ success: false, message: 'Username not recognized'});
});



app.post('/login', (req, res) => {
    const {username, password} = req.body;

    let teamsJSON = JSON.parse(fs.readFileSync(teamsPath, 'utf8'));

    for(let i = 0; i < teamsJSON.length; i++){
        if(teamsJSON[i]['username'] == username.toLowerCase()){
            if(teamsJSON[i]['password'] == password){
                res.status(200).json({ success: true, message: 'Signed In', teamName: teamsJSON[i]['team-name']});

                return;
            }
            res.status(401).json({ success: false, message: 'Bad Password'});

            return;
        }
    }

    res.status(402).json({ success: false, message: 'Username not found'});

})



app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

function generateUserProblemsArray(){
    problemsArray = [];
    for(let i = 0; i < problemsJSON.length; i++){
        problemObject = {
            "number": problemsJSON[i]['problem-number'],
            "value-java": problemsJSON[i]['boilerplate-java'],
            "value-python": problemsJSON[i]['boilerplate-python'],
            "testcases": []
        }
        for(let j = 0; j<problemsJSON[i]["testcases"].length; j++){
            testcase = problemsJSON[i]["testcases"][j]
            if(testcase["public"]){
                let input = "";
                for(let k = 0; k < problemsJSON[i]["inputs"].length; k++){
                    const varName = problemsJSON[i]["inputs"][k]['python'];
                    input+= varName;
                    input+= "=";
                    input+=testcase[varName];
                    input+="\n";
                }
                input=input.substring(0, input.length-1);
                problemObject['testcases'].push(
                    {
                        'public': true,
                        'input': input,
                        'expected-output': testcase['output'],
                        'your-output': "",
                        'status': 'cross'
                    }
                )
            }else{
                problemObject['testcases'].push(
                    {
                        'public': false,
                        'status': 'cross'
                    }
                )
            }
        }
        problemsArray.push(problemObject)
    }
    
    return problemsArray;
}


app.put("/updateValue-java", (req, res) =>{
    const {username, password, problemNumber, newValue} = req.body;
    console.log("Save request recieved");
    let teamDataJSON = JSON.parse(fs.readFileSync(teamDataPath, 'utf8'));

    for(let i = 0; i < teamDataJSON.length; i++){
        if(teamDataJSON[i]['username'].toLowerCase() == username.toLowerCase()){
            if(teamDataJSON[i]['password'].toLowerCase() == password.toLowerCase()){
                teamDataJSON[i]['problems'][problemNumber-1]['value-java'] = newValue;
                res.status(200).json({ success: true});
                fs.writeFileSync(teamDataPath, JSON.stringify(teamDataJSON, null, 2), 'utf8')
console.log("File Updated");
                return;
                
            }else{
                res.status(401).json({ success: false, message: 'Bad Password' });
                return;
    
            }
        }
    }

    res.status(401).json({ success: false, message: 'Username not recognized' });
    return;
});
app.put("/updateValue-python", (req, res) =>{
    const {username, password, problemNumber, newValue} = req.body;
    console.log("Save request recieved");
    let teamDataJSON = JSON.parse(fs.readFileSync(teamDataPath, 'utf8'));

    for(let i = 0; i < teamDataJSON.length; i++){
        if(teamDataJSON[i]['username'].toLowerCase() == username.toLowerCase()){
            if(teamDataJSON[i]['password'].toLowerCase() == password.toLowerCase()){
                
                teamDataJSON[i]['problems'][problemNumber-1]['value-python'] = newValue;
                res.status(200).json({success: true});
                fs.writeFileSync(teamDataPath, JSON.stringify(teamDataJSON, null, 2), 'utf8')
                console.log("File Updated");
                return;
                    
                
            }else{
                res.status(401).json({ success: false, message: 'Bad Password' });
                return;
    
            }
        }
    }

    res.status(401).json({ success: false, message: 'Username not recognized' });
    return;
});



app.use((req, res) => {
    res.status(404).send('Not found');
  });

const activeRunners = new Array(JSON.parse(fs.readFileSync(registeredRunnersPath, 'utf8')).length).fill(true);
const runnersJSON = JSON.parse(fs.readFileSync(registeredRunnersPath, 'utf8'));

//socket, Runner number, current text, problem number
const runDataObjects = [];
const sockets = [];

function checkIfOpen(i, problemNumber){
    if(activeRunners[i] === true){
        fetch('http://'+runnersJSON[i]['ip']+':3080/is-occupied')
        .then(response => response.text())
        .then(response => {
            console.log(response, " ", activeRunners[i]);
            if(response === 'false'){
                if(activeRunners[i] === true){
                    activeRunners[i] = false;
                    sockets.push(new WebSocket('ws://'+runnersJSON[i]['ip']+':3080'))
                    runDataObjects.push({
                        "runner-number": i,
                        "current-text": "",
                        "problem-number": problemNumber,
                        "ip": runnersJSON[i]          
                    })
                    return sockets.length-1
                }else{
                    for(let j = 0; j < activeRunners.length; j++){
                        if(activeRunners[j] === true){
                            return checkIfOpen(j, problemNumber);
                        }
                    }
                    return false;
                }
            }else{
                for(let j = 0; j < activeRunners.length; j++){
                    if(activeRunners[j] === true){
                        return checkIfOpen(j, problemNumber);
                    }
                }
                return false;
            }
        })
    }else{
        for(let j = 0; j < activeRunners.length; j++){
            if(activeRunners[j] === true){
                return checkIfOpen(j, problemNumber);
            }
        }
        return false;
    }
    
}

function formatCode(code, problemNumber, language){
    let index;
    if(language == 'java'){

        let printerFunctionName;
        let insert = ""
        if(problemsJSON[problemNumber-1]['has-customPrinterFunction']){
            printerFunctionName = problemsJSON[problemNumber-1]['customPrinterFunctions']['name']
            insert += "\n"+problemsJSON[problemNumber-1]['customPrinterFunctions']['java'];
            insert += "\n";
        }else{
            printerFunctionName = "System.out.println"
        }
        insert+="public static void main(String[] args){\n"

        const testcases = problemsJSON[problemNumber-1]['testcases'];
        const inputs = problemsJSON[problemNumber-1]['inputs'];
        for(let j = 0; j < testcases.length; j++){
            const inputNames = [];
            for(let k = 0; k < inputs.length; k++){
                inputNames.push(inputs[k]['python'] + '' + j);
                insert+=inputs[k]['java'] + '' + j + ' = ' + testcases[j][inputs[k]['python']] + ';\n';
            }
            insert+="System.out.print($$$);\n";
            insert+=printerFunctionName+"("+problemsJSON[problemNumber-1]['method-name']+'(';
            for(let k = 0; k < inputNames.length; k++){
                insert+=inputNames[k]+',';
            }
            insert = insert.substring(0, insert.length-1);
            insert+='));\n';
        }
        for(let j = code.length; j > -1; j--){
            if(code.charAt(j) == '}'){
                code = code.substring(0, j) + insert + "}\n" + code.substring(j);
                console.log(code);
                break;
            }
        }
    }else{

    }
    return code;
    
    // sockets[index].onopen = (event) => {
    //     console.log("Socket opened");
    //     socket.send(code);
    // }
    // sockets[index].onmessage = (event) => {
    //     event.data.text().then((text) => {
    //         console.log(text);
    //     })
    // }
    // sockets[index].onclose = (event) => {
    //     console.log("Socket Closed:", event)
    // }
    // sockets[index].onerror = (event) => {
    //     console.log("WebSocket error:", event);
    // }
}
// runCode("public class Main { public static void main(String[] args) { System.out.println(\"Hello, World!\"); } }", 1, 'java');