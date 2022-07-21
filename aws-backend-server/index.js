// 
// 
// 
// 
// EXEMPLO DE CÓDIGO QUE ESTÁ DESENVOLVIDO NA AWS
// 
// 
// 
// 
const express=require('express');
const cors=require('cors');
const dotenv=require('dotenv');
const app=express();
const axios=require('axios');
const fs=require('fs');
const https=require('https');
const header=require('./helpers/header');
app.use(cors());
app.use(express.json());
dotenv.config();

const key=fs.readFileSync('private.key');
const cert=fs.readFileSync('certificate.crt');
const port=3000;

const cred={
  key,
  cert
}
const user_id=(data)=>{
  return data.clientProfileData.userProfileId
}

const orderUrl="https://travellog.myvtex.com/api/oms/pvt/orders/";

app.get('/',(req,res) =>{
  return res.status(200).json(req.body);
})


app.post('/',async(req,res)=>{
  
  const {OrderId,user,State}=req.body;
  console.log(req.body);
  if(State!="payment-approved"){
      return res.json('order payment different');
  }

  if(State=='cancel'){
    const response=await axios.get(`${orderUrl}${OrderId}`,{headers:header.module});
    const data=response.data;
    const id_user=user_id(data);
    const get_points=await axios.get(`http://travellog.myvtex.com/api/dataentities/dblog/documents/${id_user}?_fields=_all`, {headers:header.module})
    const remover=get_points.data.history.findIndex(item=>item.order_id===OrderId)
    if(remover != -1){

 

    get_points.data.pontos= get_points.data.pontos -  get_points.data.history[remover].total;
    get_points.data.history.splice(remover);
   
    if(get_points.data.history.length==0){
      get_points.data.pontos=0;
    }

 
  
    const save_content=await axios.patch('http://travellog.myvtex.com/api/dataentities/dblog/documents',get_points.data,{headers:header.module});
   
   
    return res.json(get_points.data.history.pontos);
  }else{
    return res.json(get_points.data)
  }
  }


  
  const response=await axios.get(`${orderUrl}${OrderId}`,{headers:header.module});

  console.log('order')
  console.log(response.data);

  const data=response.data;


  const pontos=parseInt(data.value.toString().slice(0, data.value.toString().length - 2));
 
  const total=data.total;
  
  const id_user=user_id(data);

  console.log(id_user);

  const user_exist=await axios.get(`http://travellog.myvtex.com/api/dataentities/dblog/documents/${id_user}?_fields=_all`, {headers:header.module})
  
  
  if(user_exist.data){
   
    user_exist.data.pontos= user_exist.data.pontos + pontos
    user_exist.data.history.push({"order_id":parseInt(OrderId),total:pontos});

    try{
    const save_content=await axios.patch('http://travellog.myvtex.com/api/dataentities/dblog/documents',user_exist.data,{headers:header.module});
    console.log('salvar usuario existeinte acima');

    return res.status(200).json(save_content.data);  
  }catch(error){
    return res.status(403).json({message:error.message});
    }
   

  }else{


  const json_save={
    "id":id_user,
    "name_client":`${data["clientProfileData"].firstName} ${data["clientProfileData"].lastName}`,
    "total":total,
    "pontos":pontos,
    "history":[
      {"order_id":parseInt(OrderId),total:pontos},
    ]
  }
  try{
    const save_content=await axios.patch('http://travellog.myvtex.com/api/dataentities/dblog/documents',json_save,{headers:header.module});

    return res.status(200).json(save_content.data);
  }catch(error){

    return res.status(403).json(error.message);
  }


  }






})

app.post('/pontos',async(req,res)=>{

  const user=req.body;
  const get_points=await axios.get(`http://travellog.myvtex.com/api/dataentities/dblog/documents/${user.user}?_fields=_all`, {headers:header.module})
  if(get_points.data.pontos==undefined){
	  return res.json('0');
	}else{
	  return res.json(get_points.data.pontos)
  }
});


app.get('/cancel',async(req,res)=>{
  const {user,order} =req.body;
  const get_points=await axios.get(`http://travellog.myvtex.com/api/dataentities/dblog/documents/${user}?_fields=_all`, {headers:header.module})
  const remover=get_points.data.history.findIndex(item=>item.order_id===order)
  if(remover != -1){

 

    get_points.data.pontos= get_points.data.pontos -  get_points.data.history[remover].total;
    get_points.data.history.splice(remover);
   
    if(get_points.data.history.length==0){
      get_points.data.pontos=0;
    }

 
  
    const save_content=await axios.patch('http://travellog.myvtex.com/api/dataentities/dblog/documents',get_points.data,{headers:header.module});
   
   
    return res.json(get_points.data.history.pontos);
  }else{
    return res.json(get_points.data)
  }
})

app.get("/.well-known/pki-validation/DE458E2B314E1162C6C75FDEB605014D.txt",(req,res)=>{
  res.sendFile('/home/ec2-user/app/DE458E2B314E1162C6C75FDEB605014D.txt');
})


app.listen(port,()=>console.log(`Listening on ${port}`));

try{

  const httpsServe=https.createServer(cred,app);
  httpsServe.listen(8443);

}catch(error){
  console.log(error.message);
}