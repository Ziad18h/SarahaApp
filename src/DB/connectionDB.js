import mongoose from "mongoose";    
import cs from "./../config/config.service.js"


 const checkConnectionDB = async() => {
   await mongoose.connect(cs.uri)
    .then(()=> {
        console.log("DB Connected");
    })
    .catch((error)=> {
        console.log("Something went wrong",error);        
    })
}
export default checkConnectionDB