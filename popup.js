import apiKeys from "./hidden.js";
const mistralApiKey = apiKeys.mistralApiKey;
const geminiApiKey = apiKeys.geminiApiKey;
document.getElementById('myFile').addEventListener('change', async function() {
    /// get fileUploaded, returns file object at index 0
    let fileUploaded = this.files.item(0);
    // create form object for pdf send to ocr api
    const form = new FormData();
    form.append('purpose', 'ocr');
    form.append('file', new File([fileUploaded], `${fileUploaded.name}`));
    if(fileUploaded == null){
        return
    }
    const uploaded_pdf = await fetch('https://api.mistral.ai/v1/files', {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${mistralApiKey}`
        },
        body: form,
    })
    const pdfJSON = await uploaded_pdf.json();
    console.log(pdfJSON)
    /// get url
    const signedUrl = await fetch(`https://api.mistral.ai/v1/files/${pdfJSON.id}/url?expiry=24`, {
        method: 'GET',
        headers: {
            "Accept": "application/json" ,
            "Authorization": `Bearer ${mistralApiKey}`
        },
    })
    const responseJSON = await signedUrl.json();
    console.log(responseJSON)
    /// communicate with model and turn pdf to md
    const ocrResponse = await fetch(`https://api.mistral.ai/v1/ocr`, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json" ,
            "Authorization": `Bearer ${mistralApiKey}`
        },
        body: JSON.stringify({
            "model": "mistral-ocr-latest",
            "document": {
                "type": "document_url",
                "document_url": responseJSON.url,
            },
            "include_image_base64": true
        }),
    })
    const ocrJson = await ocrResponse.json();
    let markdownExport= ""
    const eachPage = ocrJson.pages
    for(const element of eachPage){
        markdownExport += element.markdown + " ";
    }
    console.log(markdownExport)
    const geminiRequestResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,{
        method: 'POST',
        headers: {
            'Content-Type': "application/json"
        },
        body: JSON.stringify({
            "contents": [{
                "parts": [{"text":`I've attached a markdown file of my class schedule. Can you extract all the assignments and return a response in CSV format with the following columns?
                            Due Date (e.g., 3/17)
                            Class (e.g., CSE 410)
                            Assignment Name with any important details
                            Assignment Type — must be one of: [Homework, Reading, Project, Exam]
                            Checkbox (leave unchecked)
                            Please ignore lecture entries for now." 
                            ${markdownExport}`}]
            }]
        })
    })
    const geminiJson = await geminiRequestResponse.json()
    console.log(geminiJson)
    let geminiResponse = geminiJson.candidates[0].content.parts[0].text;
    let tempResponse = geminiResponse.slice(6);
    let textResponse = tempResponse.slice(0,-3);
    console.log(textResponse)
    createFileAndDownload("downloadable.csv",textResponse)
})

function createFileAndDownload(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    const p = document.createElement('p')
    p.innerHTML = filename
    a.append(p)
    console.log(document.body)
}






