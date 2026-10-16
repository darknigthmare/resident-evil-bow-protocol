/** Reject the exact same pixel rectangles falsely supplied as two physical sides.
 * Different hashes are not proof of distinct anatomy: visual review remains required.
 */
export function assertDistinctSides(left,right,label='directional pair'){
 if(!left||!right||!left.sha256||left.sha256!==right.sha256)return;
 const rects=v=>v.frames?v.frames.map(f=>f.crop):[v.crop||[0,0,v.width,v.height]];
 if(JSON.stringify(rects(left))===JSON.stringify(rects(right)))throw Error('Duplicate anatomical pixels: '+label);
}
