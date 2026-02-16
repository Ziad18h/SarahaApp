import { populate } from "dotenv"
import { model } from "mongoose"



export const create = async ({model,data}={}) => {
    return await model.create(data)
}

export const findOne = async ({model,filter={}, populate=[], select = ""}={})=> {
    return await model.findOne(filter).populate(populate).select(select)
}


export const find = async ({model,filter={},options={}, select = ""}={})=> {
    const doc = model.findOne(filter).populate(populate).select(select)

    if(options.populate) {
doc.populate(options.populate)
    }
    if(options.skip) {
doc.skip(options.skip)
    }
    if(options.limit) {
doc.limit(options.limit)
    }
    return await doc.exec()

}


    export const updateOne = async ({model,filter={},update={},options={}}={}) => {
        const doc =  model.updateOne(filter,update,{runValidators:true,...options})
        return await doc.exec()
}

    export const findOneupdate = async ({model,filter={},update={},options={}}={}) => {
    const doc = model.updateOne(filter,update,{new: true, runValidators:true,...options})
        return await doc.exec()
}