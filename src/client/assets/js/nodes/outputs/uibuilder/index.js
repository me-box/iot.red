import Node from "./node";
import reducer from './reducer';

const config = {
    category: 'outputs',    
    color: '#d45500',
    defaults: {             
        name: {value:""},   
    },

    inputs:1,               
    
    outputs:0,             
   
    icon: "fa-picture-o ",
    
    unicode: '\uf03e',     
    
    label: function() {     
        return this.name||this.topic||"uibuilder";
    },
    
    schemafn:()=>{return {}},
    
    labelStyle: function() { 
        return this.name?"node_label_italic":"";
    },
    
    descriptionfn: ()=>"<p> This node allows you to create svg animations from input data </p>",
}

export default {
    type:     "uibuilder",
    def:      Object.assign({_: (id)=>{return id}}, config, {nodetype:"uibuilder"}),
    node:     Node,
    reducer
}
  