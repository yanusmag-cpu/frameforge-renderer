import {BufferGeometry,Float32BufferAttribute,Matrix4,Vector3} from 'three';
type Vertex={p:Vector3;n:Vector3};
/** Non-destructive runtime aperture in an existing batched set; retain interpolated normals. */
export function aperture(source:BufferGeometry,matrix:Matrix4){const g=source.index?source.toNonIndexed():source.clone(),p=g.attributes.position,n=g.attributes.normal,positions:number[]=[],normals:number[]=[];
 const world=(v:Vertex)=>{const w=v.p.clone().applyMatrix4(matrix);w.x=-w.x;w.z=-w.z;return w;};
 const planes:[number,number,number][]=[[0,1,-.70],[0,-1,.70],[1,1,.02],[1,-1,2.78],[2,1,-4.0],[2,-1,-3.14]];
 const append=(poly:Vertex[])=>{for(let j=1;j<poly.length-1;j++)for(const v of [poly[0],poly[j],poly[j+1]]){positions.push(...v.p.toArray());normals.push(...v.n.toArray());}};
 for(let i=0;i<p.count;i+=3){let remaining:Vertex[]=[0,1,2].map(k=>({p:new Vector3().fromBufferAttribute(p,i+k),n:new Vector3().fromBufferAttribute(n,i+k)}));
  for(const [axis,sign,boundary]of planes){if(!remaining.length)break;const inside:Vertex[]=[],outside:Vertex[]=[];
   for(let j=0;j<remaining.length;j++){const a=remaining[j],b=remaining[(j+1)%remaining.length],da=(world(a).getComponent(axis)-boundary)*sign,db=(world(b).getComponent(axis)-boundary)*sign;
    (da>=0?inside:outside).push(a);if((da>=0)!==(db>=0)){const u=da/(da-db),v={p:a.p.clone().lerp(b.p,u),n:a.n.clone().lerp(b.n,u).normalize()};inside.push(v);outside.push(v);}}
   append(outside);remaining=inside;
  }
 }
 const result=new BufferGeometry();result.setAttribute('position',new Float32BufferAttribute(positions,3));result.setAttribute('normal',new Float32BufferAttribute(normals,3));g.dispose();return result;
}
