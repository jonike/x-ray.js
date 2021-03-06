import {SimpleGUI} from "./SimpleGUI";
import {ThreeJSView} from "../core/src/ThreeJSView";
import {GIJSView} from "../core/src/GIJSView";
import {Thread} from "../core/src/engine/renderer/worker/Thread";
import {MathUtils} from "../core/src/engine/utils/MathUtils";
import Matrix3 = THREE.Matrix3;
/**
 * Created by Nidin Vinayakan on 27-02-2016.
 */
export class glTFTest extends SimpleGUI {

    private threeJSView:ThreeJSView;
    private giJSView:GIJSView;
    private model;
    private geometryList;

    constructor() {
        super();

        Thread.workerUrl = "../../../modules/xrenderer/workers/trace-worker-bootstrap-debug.js";

        this.i_width = 2560 / 4;
        this.i_height = 1440 / 4;
    }

    onInit() {
        var self = this;

        this.threeJSView = new ThreeJSView(this.i_width, this.i_height, this.webglOutput, this.appContainer);
        this.giJSView = new GIJSView(this.i_width, this.i_height, this.giOutput);

        //var ambient = new THREE.AmbientLight(0x5C5C5C);
        //this.threeJSView.scene.add(ambient);
        var directionalLight = new THREE.DirectionalLight(0xffeedd, 1);
        directionalLight.castShadow = true;
        directionalLight.position.set(0, 1, 0);
        this.threeJSView.scene.add(directionalLight);

        var color = 0xffeedd;

        var geometry:any = new THREE.SphereGeometry(1, 32, 32);
        var material:any = new THREE.MeshBasicMaterial({color: 0xffffff});
        var sphere = new THREE.Mesh(geometry, material);

        var pointLight1 = new THREE.PointLight(0xffffff, 5, 30);
        pointLight1.position.set(0, 10, 10);
        pointLight1.add(sphere.clone());
        this.threeJSView.scene.add(pointLight1);

        var pointLight2 = new THREE.PointLight(0xffffff, 5, 30);
        pointLight2.position.set(10, 10, 0);
        pointLight2.add(sphere.clone());
        this.threeJSView.scene.add(pointLight2);

        var pointLight3 = new THREE.PointLight(0xffffff, 1, 30);
        pointLight3.position.set(-10, -10, -10);
        pointLight3.add(sphere.clone());
        //this.threeJSView.scene.add(pointLight3);

        /*var pointLight = new THREE.PointLight(color, 1, 30);
         pointLight.position.set(5, 5, 0);
         pointLight.castShadow = true;
         pointLight.shadow.camera["near"] = 1;
         pointLight.shadow.camera["far"] = 300;
         pointLight.shadow.bias = 0.01;
         this.threeJSView.scene.add(pointLight);*/

        // texture
        var manager = new THREE.LoadingManager();
        manager.onProgress = function (item, loaded, total) {
            console.log(item, loaded, total);
        };

        var onProgress = function (xhr) {
            if (xhr.lengthComputable) {
                var percentComplete = xhr.loaded / xhr.total * 100;
                console.log(Math.round(percentComplete) + '% downloaded');
            }
        };

        var onError = function (xhr) {
        };

        geometry = new THREE.PlaneGeometry(100, 100);
        material = new THREE.MeshPhongMaterial({color: 0xB9B9B9});
        var mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.set(MathUtils.radians(-90), 0, 0);
        //mesh.position.set(0, -.5, 0);
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        this.threeJSView.scene.add(mesh);

        var start = Date.now();
        var loader = new rtt.glTFLoader();
        var position = new THREE.Vector3(-105, -78, -30);
        var scale = new THREE.Vector3(30, 30, 30);
        var self = this;
        loader.load("../../../models/gltf/Buddas_Gold.gltf", function (glTF) {
            var rootNode = self.buildThreeObjects(glTF);

            rootNode.smooth = true;
            rootNode.position.set(0, 5, 0);
            rootNode.rotation.set(-Math.PI / 2, 0, 0);
            rootNode.scale.set(0.005, 0.005, 0.005);

            self.threeJSView.scene.add(rootNode);
            var end = Date.now();
            console.log("load time:", end - start, "ms");

            self.giJSView.setThreeJSScene(self.threeJSView.scene, function () {
                self.giJSView.updateCamera(self.threeJSView.camera);
                if (self._tracing.value) {
                    self.giJSView.toggleTrace(true);
                }
            });
            self.render();
        });

        this.threeJSView.onCameraChange = function (camera) {
            self.giJSView.updateCamera(camera);
            if (self._tracing.value && self.giJSView.dirty) {
                //self.giJSView.toggleTrace(true);
            }
        };
        this.render();

        this.threeJSView.controls.onMouseDown = (event) => {
            this.toggleGI(false);
            if (!this._tracing.value && this._gi.value) {
                this._gi.click();
            }
        };
        this.threeJSView.controls.onMouseUp = (event) => {
            if (this._tracing.value && this._gi.value) {
                this.toggleGI(true);
            }
        };
        this.threeJSView.controls.onMouseWheel = (event) => {
            if (this._tracing.value && this._gi.value) {
                this.toggleGI(true);
            }
        };
    }
    buildThreeObjects(glTF) {
        console.log(glTF);
        this.geometryList = glTF.geometryList;
        var root = this.buildObject(glTF.hierarchy[0]);
        return root;
    }

    buildObject(obj, parent?) {

        parent = parent || new THREE.Object3D();

        for (var i = 0; i < obj.children.length; i++) {
            var child = obj.children[i];
            if (child.geometries) {

                for (var j = 0; j < child.geometries.length; j++) {
                    var geometryIndex = child.geometries[j];
                    var geo = this.buildBufferGeometry(this.geometryList[geometryIndex]);
                    var mat = new THREE.MeshPhongMaterial({color: 0xff0000});
                    // var mat = new THREE.MeshBasicMaterial({color: 0xff0000});
                    mat.side = THREE.DoubleSide;
                    var mesh = new THREE.Mesh(geo, mat);
                    parent.add(mesh);
                }

            } else {
                if (child.children && child.children.length > 0) {
                    this.buildObject(child, parent);
                }
            }
        }
        return parent;
    }

    buildBufferGeometry(geo) {
        var bufferGeo = new THREE.BufferGeometry();

        bufferGeo.addAttribute('position', new THREE.BufferAttribute(geo.positions, 3));
        bufferGeo.setIndex(new THREE.BufferAttribute(geo.indices, 1));

        if (geo.normals !== undefined) {
            bufferGeo.addAttribute('normal', new THREE.BufferAttribute(geo.normals, 3));
        }

        if (geo.texCoords !== undefined) {
            bufferGeo.addAttribute('uv', new THREE.BufferAttribute(geo.texCoords, 2));
        }

        bufferGeo.computeBoundingSphere();

        return bufferGeo;
    }

    hackMaterials(materials) {
        for (var i = 0; i < materials.length; i++) {
            var m = materials[i];
            if (m.name.indexOf("Body") !== -1) {
                var mm:any = new THREE["MeshStandardMaterial"]();
                mm.color.setHex(0xff0000);
                mm.lightMap = m.map;
                //mm.envMap = textureCube;
                mm.metalness = 0.9;
                mm.roughness = 0.2;
                mm.ior = 2;
                materials[i] = mm;
            } else if (m.name.indexOf("mirror") !== -1) {
                mm = new THREE["MeshStandardMaterial"]();
                mm.color.setHex(0x808080);
                mm.lightMap = m.map;
                //mm.envMap = textureCube;
                mm.metalness = 0.9;
                mm.roughness = 0.5;
                mm.ior = 1000;
                materials[i] = mm;
            } else if (m.name.indexOf("glass") !== -1) {
                mm = new THREE["MeshStandardMaterial"]();
                mm.color.copy(m.color);
//						mm.lightMap = m.map;
                //mm.envMap = textureCube;
                mm.metalness = 1;
                mm.roughtness = 0.1;
                mm.opacity = m.opacity;
                mm.ior = 1.3;
                mm.transparent = true;
                materials[i] = mm;
            } else if (m.name.indexOf("Material.001") !== -1) {
                mm = new THREE.MeshPhongMaterial({map: m.map});
                mm.specularMap = m.map;
                mm.shininess = 30;
                mm.color.setHex(0x404040);
                mm.metal = true;
                materials[i] = mm;
            }
            materials[i].side = THREE.DoubleSide;
        }
    }

    render() {
        this.threeJSView.render();
    }

    //configure GUI
    toggleGI(newValue) {
        super.toggleGI(newValue);
        if (newValue) {
            if (!this._tracing.value && !this.traceInitialized) {
                this._tracing.click();
                this.traceInitialized = true;
            }
            if (this._tracing.value && this.giJSView.dirty) {
                this.giJSView.toggleTrace(newValue);
            }
        }
    }

    toggleTrace(newValue:boolean) {
        this.giJSView.toggleTrace(newValue);
    }
}
