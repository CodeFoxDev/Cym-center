const shaderPassVSource = `#version 300 es
    precision highp float;

    layout (location = 0) in vec3 aPos;
    layout (location = 1) in vec3 aTexCoords;

    out vec2 TexCoords;

    void main()
    {
        TexCoords = aTexCoords.xy;
        gl_Position = vec4(aPos, 1.0);
    }
`;
const shaderPassFSource = `#version 300 es
    precision highp float;

    out vec4 FragColor;

    in vec2 TexCoords;

    uniform sampler2D gPosition;
    uniform sampler2D gNormal;
    //uniform vec3 uViewPos;

    void main()
    {           
        // retrieve data from gbuffer
        vec3 fragPos = texture(gPosition, TexCoords).rgb;
        vec3 normal = texture(gNormal, TexCoords).rgb;
        vec3 diffuse = vec3(1., 0., 0.);
        float specular = 1.;
        
        
        FragColor = vec4(fragPos, 1.);//vec4(diffuse * normal, specular);
    }
`;

const geometryPassVSource = `#version 300 es
    precision highp float;

    layout (location = 0) in vec3 aPos;
    layout (location = 1) in vec3 aNormal;
    
    out vec3 FragPos;
    out vec3 Normal;

    uniform mat4 uModel;
    uniform mat4 uView;
    uniform mat4 uProjection;

    void main()
    {
        vec4 worldPos = uModel * vec4(aPos, 1.0);
        FragPos = worldPos.xyz; 
        
        mat3 normalMatrix = transpose(inverse(mat3(uModel)));
        Normal = normalMatrix * aNormal;

        gl_Position = uProjection * uView * worldPos;
    }
`;
const geometryPassFSource = `#version 300 es
    precision highp float;

    layout (location = 0) out vec3 gPosition;
    layout (location = 1) out vec3 gNormal;
    
    in vec3 FragPos;
    in vec3 Normal;

    void main()
    {  
        if(FragPos.y > 400.) {
            gPosition = FragPos;
        }
        else {
            gPosition = vec3(1., 0., 0.);
        }

        gNormal = normalize(Normal);
    }
`;

let deferredRenderer;
function loadDeferredRenderer() {
    const geometryPassProgram = ShaderProgramClass.getProgram(geometryPassVSource, geometryPassFSource);
    const shaderPassProgram = ShaderProgramClass.getProgram(shaderPassVSource, shaderPassFSource);
    deferredRenderer = new DeferredRenderer(geometryPassProgram, shaderPassProgram);
}