import { NodeProperties, Red } from 'node-red';

export = (RED: Red) => {
    RED.nodes.registerType('tahoma-read', function(this, props) {
        const config = props;
        RED.nodes.createNode(this, config);
    });
};
