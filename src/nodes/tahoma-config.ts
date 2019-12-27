import { NodeProperties, Red } from 'node-red';
import { ISomfyCredentialsProperties } from '../interfaces/common';

export = (RED: Red) => {
    RED.nodes.registerType('tahoma-config', function(this, props: any ) {
        // const config = props as ISomfyCredentialsProperties;
        RED.nodes.createNode(this, props);
        this.apikey = props.apikey;
        this.apisecret = props.apisecret;
        this.accesstoken = props.accesstoken;
        this.refreshtoken = props.refreshtoken;
    });
};
