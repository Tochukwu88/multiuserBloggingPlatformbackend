const Blog = require('../models/blog')
const Category = require('../models/category')
const Tag = require('../models/tag')
const formidable = require('formidable')
const slugify = require('slugify')
const stripHtml = require('string-strip-html')
const _ = require('lodash')
const fs = require('fs')
const {errorHandler} = require('../helpers/dbErrorHandler')
const {smartTrim} = require('../helpers/blog')
const User = require('../models/user')



exports.create=(req,res)=>{
   let form = new formidable.IncomingForm()
   form.keepExtensions = true
   form.parse(req,(err,fields,files)=>{
      if(err){
          return res.status(400).json({
              error:'image could not upload'
          })
      }
      const {title,body,categories,tags} = fields
     
      if(!title || !title.length){
          return res.status(400).json({
              error:'title is required'
          })
      }
      if(!body || body.length < 200){
        return res.status(400).json({
            error:'Content is too small'
        })
    }
    if(!categories || categories.length === 0){
        return res.status(400).json({
            error:'at least one category is required'
        })
    }
    if(!tags || tags.length === 0){
        return res.status(400).json({
            error:'at least one tag is required'
        })
    }

      let blog = new Blog()
      blog.title = title
      blog.body = body
      blog.excerpt = smartTrim(body,320,'',' ...')
      blog.slug = slugify(title).toLowerCase()
      blog.mtitle = `${title} | ${process.env.APP_NAME}`
      blog.mdesc = stripHtml(body.substring(0,160))
      blog.postedBy = req.user._id
      let arrayOfCategories = categories && categories.split(',')
      let arrayOfTags = tags && tags.split(',')
      if(files.photo){
          if(files.photo.size > 10000000){
            return res.status(400).json({
                error:'image should be less than 1mb in size'
            })


          }
          blog.photo.data = fs.readFileSync(files.photo.path)
          blog.photo.contentType= files.photo.type
      }
      blog.save((err,result)=>{
        if(err){
            return res.status(400).json({
                error:errorHandler(err)
            })
        }
        // res.json(result)
        Blog.findByIdAndUpdate(result._id,{$push:{categories:arrayOfCategories}},{new:true}).exec((err,result)=>{
            if(err){
                return res.status(400).json({
                    error:errorHandler(err)
                })
            }else{
                Blog.findByIdAndUpdate(result._id,{$push:{tags:arrayOfTags}},{new:true}).exec((err,result)=>{
                    if(err){
                        return res.status(400).json({
                            error:errorHandler(err)
                        })
                    }else{
                        res.json(result)
                    }
                })

            }
        })

      })
   })
}
exports.list = (req,res)=>{
    Blog.find({}).populate('categories','_id name slug')
    .populate('tags','_id name slug')
    .populate('postedBy','_id name username')
    .select('_id title slug excerpt categories tags postedBy createdAt updatedAt')
    .exec((err,data)=>{
        if(err){
            return res.json({
                error:errorHandler(err)
            })
        }
        res.json(data)
    })

}
exports.listAllBlogsCategoriesTags =(req,res)=>{
    let limit = req.body.limit ? parseInt(req.body.limit) : 10
    let skip = req.body.skip ? parseInt(req.body.skip) : 0
    let blog
    let categories
    let tags
    Blog.find({}).populate('categories','_id name slug')
    .populate('tags','_id name slug')
    .populate('postedBy','_id name username profile')
    .sort({createdAt:-1})
    .skip(skip)
    .limit(limit)
    .select('_id title slug excerpt categories tags postedBy createdAt updatedAt')
    .exec((err,data)=>{
        if(err){
            return res.json({
                error:errorHandler(err)
            })
        }
        blog = data
        Category.find({}) .exec((err,c)=>{
            if(err){
                return res.json({
                    error:errorHandler(err)
                })
            }
            categories = c
            Tag.find({}) .exec((err,t)=>{
                if(err){
                    return res.json({
                        error:errorHandler(err)
                    })
                }
                tags= t
                res.json({
                    blog,categories,tags, size:blog.length
                })
            })
        })
       
    })

}
exports.update=(req,res)=>{
    const slug = req.params.slug.toLowerCase()
    Blog.findOne({slug}).exec((err,oldBlog)=>{
        if(err){
            return res.status(400).json({
                error:errorHandler(err)
            })
        }
        let form = new formidable.IncomingForm()
             form.keepExtensions = true
             form.parse(req,(err,fields,files)=>{
                if(err){
                    return res.status(400).json({
                        error:'image could not upload'
                    })
                }
             let slugBeforeMerge = oldBlog.slug
             oldBlog = _.merge(oldBlog,fields)
             oldBlog.slug= slugBeforeMerge
             const {body,mdesc,categories,tags} = fields
               
                if(body){
                   oldBlog.excerpt = smartTrim(body,320,'',' ...')
                   oldBlog.mdesc = stripHtml(body.substring(0,160))
                }
                if(categories){
                    oldBlog.categories = categories.split(',')
                    
                 }
                 if(tags){
                    oldBlog.tags = tags.split(',')
                    
                 }
             
          
               
                if(files.photo){
                    if(files.photo.size > 10000000){
                      return res.status(400).json({
                          error:'image should be less than 1mb in size'
                      })
          
          
                    }
                    oldBlog.photo.data = fs.readFileSync(files.photo.path)
                    oldBlog.photo.contentType= files.photo.type
                }
                oldBlog.save((err,result)=>{
                  if(err){
                      return res.status(400).json({
                          error:errorHandler(err)
                      })
                  }
                   res.json(result)
                
          
                })
             })

    })
    
   
 }
exports.remove =(req,res)=>{
    const slug = req.params.slug.toLowerCase()
    Blog.findOneAndRemove({slug}).exec((err,data)=>{
        if(err){
            return res.json({
                error:errorHandler(err)
            })
        }
        res.json({
            message:'blog deleted successfully'
        })
    })


}
exports.read =(req,res)=>{
    const slug = req.params.slug.toLowerCase()
    Blog.findOne({slug}).populate('categories','_id name slug')
    .populate('tags','_id name slug')
    .populate('postedBy','_id name username')
    .select('_id title body slug  mtitle mdesc categories tags postedBy createdAt updatedAt')
    .exec((err,data)=>{
        if(err){
            return res.json({
                error:errorHandler(err)
            })
        }
        res.json(data)
    })


}
exports.photo = (req,res)=>{
    const slug = req.params.slug.toLowerCase()
    Blog.findOne({slug})
    .select('photo')
    .exec((err,blog)=>{
        if(err || !blog){
            return res.status(400).json({
                error:err
            })
        }
        res.set('Content-Type', blog.photo.contentType)
        return res.send(blog.photo.data)
    })

}
exports.listRelated = (req,res)=>{
    let limit = req.body.limit ? parseInt(req.body.limit) : 3
    const {_id, categories} = req.body.blog
    Blog.find({_id:{$ne:_id}, categories:{$in:categories}})
    .limit(limit)
    .populate('postedBy', '_id name username profile')
    .select('title slug excerpt postedBy createdAt updatedAt')
    .exec((err,blogs)=>{
        if(err ){
            return res.status(400).json({
                error:'blogs not found'
            })
        }
    
        return res.json(blogs)
    })


}
exports.listSearch = (req,res) =>{
    const {search} = req.query
    if (search){
        Blog.find({
            $or:[{title:{$regex:search,$options:'i'}},{body:{$regex:search,$options:'i'}}]
        },(err,blogs)=>{
            if(err){
                res.status(400).json({
                    error:errorHandler(err)
                })
            }
            res.json(blogs)
        }).select('-photo -body')
    }
}

exports.listByUser = (req,res)=>{
    User.findOne({username:req.params.username}).exec((err,user)=>{
        if(err){
            res.status(400).json({
                error:errorHandler(err)
            })
        }
        let userId = user._id
        Blog.find({postedBy:userId})
        .populate('categories','_id name slug')
        .populate('tags','_id name slug')
        .populate('postedBy','_id name username')
        .select('_id title slug  postedBy createdAt updatedAt')
        .exec((err,data)=>{
            if(err){
                return res.json({
                    error:errorHandler(err)
                })
            }
            res.json(data)
        })
    })
}
