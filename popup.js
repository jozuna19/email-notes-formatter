const DIVIDER = "-------------------------------------------------------------------------------"

function normalizeNewlines(s){
return (s||"").replace(/\r\n/g,"\n").replace(/\r/g,"\n")
}

function removeNoise(raw){

const lines = normalizeNewlines(raw).split("\n")

const noisePatterns = [

/^Skip to content/i,
/^Using .* with screen readers/i,
/^Conversation opened/i,
/^All messages read/i,
/^Hiver-/i,
/^AI Overview/i,
/^By Gemini/i,
/^External$/i,
/^Inbox$/i,
/^CAUTION:/i,
/^\*WARNING\*/i,
/^Sent from my iPhone/i,
/^Sent from Outlook/i,
/^Attachments$/i,
/Scanned by Gmail/i,
/One attachment/i,
/.*logo.*\.(png|jpg|jpeg|gif)/i,
/.*transparent.*\.(png|jpg|jpeg|gif)/i,
/^image\.(png|jpg|jpeg|gif)$/i

]

function isNoise(line){

const s=(line||"").trim()
if(!s) return false

if(s.toLowerCase().includes("you don't often get email")) return true
if(s.toLowerCase().includes("external sender")) return true

return noisePatterns.some(rx=>rx.test(s))

}

return lines.filter(l=>!isNoise(l)).join("\n")

}

function stripEmailAddress(name){
return (name||"").replace(/\s*<[^>]+>\s*$/,"").trim()
}

function isSignatureLine(line){

const s=line.trim().toLowerCase()
if(!s) return false

if(/project manager/.test(s)) return true
if(/construction/.test(s)) return true
if(/employee-owned/.test(s)) return true
if(/builder of choice/.test(s)) return true
if(/cell/.test(s)) return true
if(/office/.test(s)) return true
if(/suite/.test(s)) return true
if(/drive/.test(s)) return true
if(/road/.test(s)) return true
if(/_{5,}/.test(s)) return true
if(/\d{3}\.\d{3}\.\d{4}/.test(s)) return true

return false

}

function stripSignature(body,sender){

const lines = normalizeNewlines(body).split("\n")

for(let i=0;i<lines.length;i++){

const line = lines[i].trim()

if(!line) continue

if(line===sender) return lines.slice(0,i).join("\n").trim()

if(isSignatureLine(line)) return lines.slice(0,i).join("\n").trim()

}

return body.trim()

}

function trimQuoted(body){

const lines = normalizeNewlines(body).split("\n")

const markers = [
/^From:/i,
/^Sent:/i,
/^To:/i,
/^Subject:/i,
/^On .* wrote:/i
]

for(let i=0;i<lines.length;i++){

if(markers.some(rx=>rx.test(lines[i]))){
return lines.slice(0,i).join("\n").trim()
}

}

return body.trim()

}

function formatThread(raw){

const text = normalizeNewlines(removeNoise(raw)).trim()
if(!text) return ""

const lines = text.split("\n")
const starts = []

const headerRegex = /^[A-Z][A-Za-z .'-]{1,90}(\s<[^>]+>)?$/

for(let i=0;i<lines.length;i++){

const l = lines[i].trim()
if(!l) continue

if(headerRegex.test(l)){

const dateLine = (lines[i+1]||"").trim()
const toLine = (lines[i+2]||"").trim()

if(/AM|PM|\d{4}/.test(dateLine) && /^to\b/i.test(toLine)){
starts.push(i)
}

}

}

const blocks=[]

for(let s=0;s<starts.length;s++){

const start=starts[s]
const end=s+1<starts.length?starts[s+1]:lines.length

const name=stripEmailAddress(lines[start].trim())
const date=(lines[start+1]||"").trim()
const to=(lines[start+2]||"").trim()

let bodyStart=start+3
while(bodyStart<end&&!lines[bodyStart].trim()) bodyStart++

let body=lines.slice(bodyStart,end).join("\n").trim()

body=removeNoise(body)
body=trimQuoted(body)
body=stripSignature(body,name)

body = body
.split("\n")
.map(l=>l.trim())
.filter(l=>l.length>0)
.join("\n")

const msg=[name,date,to,body].filter(Boolean).join("\n")

blocks.push(msg)

}

return blocks.join(`\n${DIVIDER}\n`).trim()

}

const box=document.getElementById("box")
const formatSelectedBtn=document.getElementById("formatSelectedBtn")
const formatPastedBtn=document.getElementById("formatPastedBtn")
const copyBtn=document.getElementById("copyBtn")

function getActiveTab(){
return new Promise(resolve=>{
chrome.tabs.query({active:true,currentWindow:true},([tab])=>resolve(tab))
})
}

async function getSelection(){

const tab=await getActiveTab()

return new Promise(resolve=>{
chrome.tabs.sendMessage(tab.id,{type:"GET_SELECTION_TEXT"},res=>{
resolve(res?.text||"")
})
})

}

async function copy(text){
await navigator.clipboard.writeText(text)
}

formatSelectedBtn.addEventListener("click",async()=>{

const selected=await getSelection()
const formatted=formatThread(selected)

box.value=formatted||"(No text selected)"

if(formatted) await copy(formatted)

})

formatPastedBtn.addEventListener("click",()=>{

const formatted=formatThread(box.value)
box.value=formatted||"(Nothing to format)"

})

copyBtn.addEventListener("click",async()=>{
if(box.value) await copy(box.value)
})