import express from "express"
import cs from "./config/config.service.js"
import checkConnectionDB from "./DB/connectionDB.js";
import userRouter from "./modules/users/user.controller.js";
const app = express();


const bootstarp = () => {

    app.use(express.json());
 
    app.get("/",(req,res,next)=> {
        res.status(200).json({msg: "Welcome to Saraha"})
    })
 checkConnectionDB()




app.use('/users',userRouter)

    app.use("{/*demo}",(req,res,next)=> {
      throw new Error(`Url ${req.originalUrl} Not Found....`, {cause:404});
      
    })


app.use((err,req,res,next) => {
   
   res.status(err.cause ||500).json({message: err.message, stack: err.stack})
})

    app.listen(cs.port,()=> {
        console.log(`sever is running on port ${cs.port}`);
    })
}


export {
    bootstarp
}