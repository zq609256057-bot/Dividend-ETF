(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.DividendIndexSwitchAtomic=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  var STATES=Object.freeze({IDLE:'IDLE',LOADING:'LOADING',READY:'READY',ERROR:'ERROR'});

  function create(options){
    if(!options||typeof options.load!=='function'||typeof options.commit!=='function')throw new Error('atomic index switch adapters missing');
    var state=STATES.IDLE;
    var requestId=0;
    var activeController=null;
    var targetCode=null;

    function transition(next,context){
      state=next;
      if(typeof options.onState==='function')options.onState(next,context||{});
    }

    async function switchIndex(nextCode,meta){
      meta=meta||{};
      if(typeof options.isAllowed==='function'&&!options.isAllowed(nextCode))throw new Error('index not enabled: '+nextCode);
      var currentRequestId=++requestId;
      if(activeController&&typeof activeController.abort==='function')activeController.abort();
      activeController=typeof AbortController==='function'?new AbortController():null;
      targetCode=nextCode;
      var context={code:nextCode,requestId:currentRequestId,meta:meta,signal:activeController?activeController.signal:undefined};

      if(typeof options.begin==='function')options.begin(nextCode,context);
      transition(STATES.LOADING,context);

      try{
        var data=meta.providedData!==undefined?meta.providedData:await options.load(nextCode,context);
        if(currentRequestId!==requestId||targetCode!==nextCode)return{ok:false,stale:true,code:nextCode,requestId:currentRequestId};
        if(typeof options.matches==='function'&&!options.matches(data,nextCode,context))throw new Error('response index mismatch: '+nextCode);
        options.commit(data,nextCode,context);
        transition(STATES.READY,context);
        return{ok:true,stale:false,code:nextCode,requestId:currentRequestId,data:data};
      }catch(error){
        if(currentRequestId!==requestId||targetCode!==nextCode||(error&&error.name==='AbortError'))return{ok:false,stale:true,code:nextCode,requestId:currentRequestId,error:error};
        if(typeof options.fail==='function')options.fail(error,nextCode,context);
        transition(STATES.ERROR,Object.assign({},context,{error:error}));
        return{ok:false,stale:false,code:nextCode,requestId:currentRequestId,error:error};
      }
    }

    return{
      STATES:STATES,
      switchIndex:switchIndex,
      get state(){return state;},
      get requestId(){return requestId;},
      get targetCode(){return targetCode;}
    };
  }

  return{STATES:STATES,create:create};
});
