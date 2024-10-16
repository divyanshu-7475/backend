import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchems= new Schema(
    {
        videoFile:{
            type:String,
            required: true,

        },
        thumbnail:{
            type:String,
            required: true
        },
        ttitle:{
            type:String,
            required: true
        },
        description:{
            type:String,
            required: true
        },
        duration:{
            type:Number,
            required: true
        },
        views:{
            type:Number,
            default:0
        },
        isPublished:{
            type:Boolean,
            default:true
        },
        owner:{
            type:Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
)

videoSchems.plugin(mongooseAggregatePaginate)

export const Video= mongoose.model("Video",videoSchems)