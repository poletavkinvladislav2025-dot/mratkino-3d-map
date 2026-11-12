/** Shared local overview; explicit route bounds are always handled separately. */
export function welcomeView(width){
 const compact=width<=640;
 return {bounds:compact?[[58.29,53.78],[58.65,54.025]]:[[58.25,53.75],[58.72,54.07]],padding:compact?18:45,pitch:compact?18:35,bearing:0};
}
