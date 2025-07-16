const express = require('express')
const OpenAI = require('openai');
const router = express.Router()


const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

router.post('/', async(req,res) => {
    const {message} = req.body

    try{
        const response = await openai.chat.completions.create({
            model:"gpt-4.1",
            message: [
                {
                    role: "system",
                    content: "You are a helpful customer support chatbot for a bus booking app. You answer queries about tickets, timings, cancellations, and seats."
                    },
                    {
                    role: "user",
                    content: message,
                },
            ]

        })
        res.json({success: true,  reply: response.choices[0].message.content,})
    }
    catch(err){
        res.status(500).json({success:false, error: err.message})
    }
})

module.exports = router