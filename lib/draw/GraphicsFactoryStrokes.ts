import {Point, MathConsts, Rectangle, Matrix} from "@awayjs/core";

import {ImageSampler, AttributesBuffer, AttributesView, Float3Attributes, Float2Attributes} from "@awayjs/stage";

import {IMaterial, Style} from "@awayjs/renderer";

import {Shape} from "../renderables/Shape";
import {TriangleElements} from "../elements/TriangleElements";
import {JointStyle}	 from "../draw/JointStyle";
import {GraphicsPath} from "../draw/GraphicsPath";
import {GraphicsPathCommand} from "../draw/GraphicsPathCommand";
import {GraphicsFactoryHelper} from "../draw/GraphicsFactoryHelper";
import {GraphicsStrokeStyle} from "../draw/GraphicsStrokeStyle";
import {LineScaleMode} from "../draw/LineScaleMode";
import {Graphics} from "../Graphics";

/**
 * The Graphics class contains a set of methods that you can use to create a
 * vector shape. Display objects that support drawing include Sprite and Shape
 * objects. Each of these classes includes a <code>graphics</code> property
 * that is a Graphics object. The following are among those helper functions
 * provided for ease of use: <code>drawRect()</code>,
 * <code>drawRoundRect()</code>, <code>drawCircle()</code>, and
 * <code>drawEllipse()</code>.
 *
 * <p>You cannot create a Graphics object directly from ActionScript code. If
 * you call <code>new Graphics()</code>, an exception is thrown.</p>
 *
 * <p>The Graphics class is final; it cannot be subclassed.</p>
 */
export class GraphicsFactoryStrokes
{
	public static draw_pathes(targetGraphics:Graphics){
		//return;
		var len=targetGraphics.queued_stroke_pathes.length;
		var i=0;
		for(i=0; i<len; i++){
			var strokePath:GraphicsPath=targetGraphics.queued_stroke_pathes[i];
			var strokeStyle:GraphicsStrokeStyle=(<GraphicsStrokeStyle>strokePath.style);
			var obj:any = Graphics.get_material_for_color(strokeStyle.color, strokeStyle.alpha);
			var material:IMaterial=obj.material;

			var final_vert_list:number[]=[];
			strokePath.prepare(targetGraphics._scaleX);
			GraphicsFactoryStrokes.draw_path([strokePath], final_vert_list, material.curves, targetGraphics.getSpriteScale());
			final_vert_list=final_vert_list.concat(strokePath.verts);
			var attributesView:AttributesView = new AttributesView(Float32Array, material.curves?3:2);
			attributesView.set(final_vert_list);
			var attributesBuffer:AttributesBuffer = attributesView.attributesBuffer.cloneBufferView();
			attributesView.dispose();
			var elements:TriangleElements = new TriangleElements(attributesBuffer);
			elements.setPositions(new Float2Attributes(attributesBuffer));
			elements.halfStrokeThickness=strokeStyle.half_thickness;
			elements.lastStrokeScale=targetGraphics._scaleX;
			//	if(material.curves)
			//		elements.setCustomAttributes("curves", new Byte4Attributes(attributesBuffer, false));
			//	material.alpha=(<GraphicsStrokeStyle>this.queued_stroke_pathes[i].style).alpha;
			var shape:Shape=targetGraphics.addShape(Shape.getShape(elements, material));
			shape.isStroke=true;
			shape.strokePath=strokePath;
			if(obj.colorPos){
				shape.style = new Style();
				var sampler:ImageSampler = new ImageSampler();
				material.animateUVs=true;
				shape.style.addSamplerAt(sampler, material.getTextureAt(0));

				shape.style.uvMatrix = new Matrix(0, 0, 0, 0, obj.colorPos.x, obj.colorPos.y);
			}
		}
		targetGraphics.queued_stroke_pathes.length=0;


	}
	public static updateStrokesForShape(shape:Shape, scale:number, scaleMode:string ){
		//return;

		var elements:TriangleElements = <TriangleElements> shape.elements;
		if(elements.lastStrokeScale>(scale*2) || elements.lastStrokeScale<(scale*0.5)){
			//graphicsPath.prepare(scale);
			elements.lastStrokeScale=scale;

		}
		else{
			//elements.lastStrokeScale=scale;
			//return;
		}

		var graphicsPath = shape.strokePath;
		elements.lastStrokeScale=scale;
		var final_vert_list:Array<number>=[];
		GraphicsFactoryStrokes.draw_path([graphicsPath], final_vert_list, false, scale, scaleMode);
		elements.setPositions(final_vert_list);
		elements.invalidate();


	}
	public static draw_path(graphic_pathes:Array<GraphicsPath>, final_vert_list:Array<number>, curves:boolean, scale:number=1, scaleMode:string=LineScaleMode.NORMAL){
		
		var len=graphic_pathes.length;
		var positions:number[][];
		var strokeStyle:GraphicsStrokeStyle;
		var data:number[];
		var i:number=0;
		var k:number=0;

		var tmp_dir_point:Point=new Point();
		var last_dir_vec:Point=new Point();
		var tmp_point:Point = new Point();
		var tmp_point2:Point=new Point();
		var tmp_point3:Point=new Point();

		var end_x:number = 0;
		var end_y:number = 0;
		var prev_x:number = 0;
		var prev_y:number = 0;
		var prev_prev_x:number = 0;
		var prev_prev_y:number = 0;
		var right_point_x:number = 0;
		var right_point_y:number = 0;
		var left_point_x:number = 0;
		var left_point_y:number = 0;
		var right_point_merged_x:number=0;
		var right_point_merged_y:number=0;
		var left_point_merged_x:number=0;
		var left_point_merged_y:number=0;
		var left_point_contour_x:number=0;
		var left_point_contour_y:number=0;
		var left_point_contour_prev_x:number=0;
		var left_point_contour_prev_y:number=0;
		var right_point_contour_x:number=0;
		var right_point_contour_y:number=0;
		var right_point_contour_prev_x:number=0;
		var right_point_contour_prev_y:number=0;
		var start_right_x:number=0;
		var start_right_y:number=0;
		var start_left_x:number=0;
		var start_left_y:number=0;
		var end_right_x:number=0;
		var end_right_y:number=0;
		var end_left_x:number=0;
		var end_left_y:number=0;
		var prev_normal_x:number;
		var prev_normal_y:number;

		var addJoints:boolean=true;
		var add_segment:boolean=false;
		var closed:boolean=false;
		
		var new_dir:number=0;
		var dir_delta:number=0;
		var last_direction:number=0;
		var distance_miter:number=0;
		var half_angle:number=0;
		var distance:number=0;
		var half_thickness:number=0;
		
		var new_cmds:number[]=[];
		var new_pnts:number[]=[];

		var new_cmds_cnt:number=0;
		var new_pnts_cnt:number=0;
		
		//console.log("process stroke");

		var cp=0;
		for(cp=0; cp<len; cp++){


			positions = graphic_pathes[cp]._positions;
			strokeStyle = graphic_pathes[cp].stroke();
			half_thickness=strokeStyle.half_thickness;

			//console.log("process contour", positions);
			if(scaleMode==LineScaleMode.NORMAL){
				if((half_thickness*scale)<=0.5){
					half_thickness=0.5*(1/scale);
				}
			}

			else if(scaleMode==LineScaleMode.NONE){
				half_thickness*=(1/scale);
			}

			if(strokeStyle.scaleMode==LineScaleMode.HAIRLINE){
				half_thickness=0.5*(1/scale);
			}

			for(k=0; k<positions.length; k++) {
				//commands = contour_commands[k];
				data = positions[k];


				// check if the path is closed. if yes, than set the last_dir_vec from last segment
				closed = true;
				prev_prev_x=null;
				prev_prev_y=null;
				if((data[0] != data[data.length-2]) || (data[1] != data[data.length-1]))
					closed = false;
				else{
					last_dir_vec.x = data[data.length-2]-data[data.length-4];
					last_dir_vec.y = data[data.length-1]-data[data.length-3];
					last_dir_vec.normalize();
					last_direction = Math.atan2(last_dir_vec.y, last_dir_vec.x) * MathConsts.RADIANS_TO_DEGREES;
					prev_prev_x=data[data.length-2];
					prev_prev_y=data[data.length-1];
					//console.log("Path is closed, we set initial direction: "+last_direction);
				}

				prev_x=data[0]; 
				prev_y=data[1];

				new_cmds=[];
				new_pnts=[];
				new_cmds_cnt=0;
				new_pnts_cnt=0;
				
				prev_normal_x = -1*last_dir_vec.y;
				prev_normal_y = last_dir_vec.x;

				for (i = 2; i < data.length; i+=2) {

					end_x = data[i];
					end_y = data[i+1];

					// if the points are the same, we dont need to do anything.
					if((end_x != prev_x)||(end_y != prev_y)){

						//get the directional vector and the direction for this segment
						tmp_dir_point.x = end_x - prev_x;
						tmp_dir_point.y = end_y - prev_y;
						tmp_dir_point.normalize();
						new_dir = Math.atan2(tmp_dir_point.y, tmp_dir_point.x) * MathConsts.RADIANS_TO_DEGREES;

						// get the difference in angle to the last segment
						dir_delta = new_dir - last_direction;
						if(dir_delta>180){
							dir_delta-=360;
						}
						if(dir_delta<-180){
							dir_delta+=360;
						}
						last_direction = new_dir;

						// rotate direction around 90 degree
						tmp_point.x = -1 * tmp_dir_point.y;
						tmp_point.y = tmp_dir_point.x;

						// find the 2 points left and right of the segments end-point
						right_point_x = prev_x + (tmp_point.x * half_thickness);
						right_point_y = prev_y + (tmp_point.y * half_thickness);
						left_point_x = prev_x - (tmp_point.x * half_thickness);
						left_point_y = prev_y - (tmp_point.y * half_thickness);

						add_segment=false;
						// check if this is the first segment, and the path is not closed
						// in this case, we can just set the points to the contour points
						if((i==2)&&(!closed)){
							//console.log("segment "+i+"Path is not closed, we can just add the first segment")
							add_segment=true;
						}
						else{

							// we need to figure out if we need to add a joint or not
							if ((dir_delta==0)||(dir_delta==180)){
								// straight line (back or forth)
								// only add segment if this is the first
								add_segment=(i==2);
							}
							else {
								add_segment=true;

								// dir_delta delta is the difference in direction between the segments
								// 2 segments forming a straight line would have a dir_delta of 0
								// a segments thta goes straight back would have a dir_delta of 180 or -180
								
								// convert this into a angle where 0 means going back and 180 means straight forward.
															
								half_angle=(180-(dir_delta));
								if(dir_delta<0){
									half_angle = (-180-(dir_delta));
								}	
								// 	get the half of this angle. 
								//	half_angle is the angle need to rotate our segments direction with
								//  in order to have a direction vector that points from original point to the merged contour points							
								half_angle = half_angle * -0.5 * MathConsts.DEGREES_TO_RADIANS;

								// get the direction vector that splits the angle between the 2 segments in half. 
								tmp_point2.x = tmp_dir_point.x * Math.cos(half_angle) + tmp_dir_point.y * Math.sin(half_angle);
								tmp_point2.y = tmp_dir_point.y * Math.cos(half_angle) - tmp_dir_point.x * Math.sin(half_angle);
								tmp_point2.normalize();

								//  calculate the distance that we need to move original point with direction-vector calculated above
								// 	very steep angles result in impossible values for distance
								//	we need to catch those cases and set sensible fallback for distance
								if (Math.abs(dir_delta) <= 1 || Math.abs(dir_delta) >= 359
									|| (Math.abs(dir_delta) >= 179 && Math.abs(dir_delta) <= 181) ) {
									distance=(dir_delta<0)?half_thickness:-half_thickness;
								}
								else{
									distance = half_thickness / Math.sin(half_angle);
								}


								// 	get the merged points left and right 
								//	by moving from original point along the direction vector 
								right_point_merged_x = prev_x - (tmp_point2.x * distance);
								right_point_merged_y = prev_y - (tmp_point2.y * distance);
								left_point_merged_x = prev_x + (tmp_point2.x * distance);
								left_point_merged_y = prev_y + (tmp_point2.y * distance);

								// use different points dependent if dir_delta is positive or negative
								if (dir_delta > 0){
									left_point_contour_x = prev_x - (tmp_point.x * half_thickness);
									left_point_contour_y = prev_y - (tmp_point.y * half_thickness);
									left_point_contour_prev_x = prev_x - (prev_normal_x * half_thickness);
									left_point_contour_prev_y = prev_y - (prev_normal_y * half_thickness);
									right_point_x = right_point_merged_x;
									right_point_y = right_point_merged_y;
									left_point_x = left_point_contour_x;
									left_point_y = left_point_contour_y;
								}
								else{
									right_point_contour_x = prev_x + (tmp_point.x * half_thickness);
									right_point_contour_y = prev_y + (tmp_point.y * half_thickness);
									right_point_contour_prev_x = prev_x + (prev_normal_x * half_thickness);
									right_point_contour_prev_y = prev_y + (prev_normal_y * half_thickness);
									left_point_x = left_point_merged_x;
									left_point_y = left_point_merged_y;
									right_point_x = right_point_contour_x;
									right_point_y = right_point_contour_y;
								}

								addJoints=true;

								// check if we need to add a joint
								if (strokeStyle.jointstyle==JointStyle.MITER){
									// 	miter means that we have no bevel effect on the corners, 
									// 	as long as the mitter-value is within a given miter_limit
									distance_miter = (Math.sqrt((distance*distance)-(half_thickness*half_thickness))/half_thickness);
									if(distance_miter<=strokeStyle.miter_limit){
										// if within miter_limit, miter is applied, and we only need to add the merged points
										addJoints=false;
										left_point_x = left_point_merged_x;
										left_point_y = left_point_merged_y;
										right_point_x = right_point_merged_x;
										right_point_y = right_point_merged_y;
									}
									else{										
										if (dir_delta > 0){
											left_point_contour_x = left_point_contour_x-(tmp_dir_point.x*(strokeStyle.miter_limit*half_thickness));
											left_point_contour_y = left_point_contour_y-(tmp_dir_point.y*(strokeStyle.miter_limit*half_thickness));
											tmp_point3.x=prev_normal_y*-1;
											tmp_point3.y=prev_normal_x;
											left_point_contour_prev_x = left_point_contour_prev_x-(tmp_point3.x*(strokeStyle.miter_limit*half_thickness));
											left_point_contour_prev_y = left_point_contour_prev_y-(tmp_point3.y*(strokeStyle.miter_limit*half_thickness));
										}
										else{
											right_point_contour_x = right_point_contour_x-(tmp_dir_point.x*(strokeStyle.miter_limit*half_thickness));
											right_point_contour_y = right_point_contour_y-(tmp_dir_point.y*(strokeStyle.miter_limit*half_thickness));
											tmp_point3.x=prev_normal_y*-1;
											tmp_point3.y=prev_normal_x;
											right_point_contour_prev_x = right_point_contour_prev_x-(tmp_point3.x*(strokeStyle.miter_limit*half_thickness));
											right_point_contour_prev_y = right_point_contour_prev_y-(tmp_point3.y*(strokeStyle.miter_limit*half_thickness));
										}
									}
								}
								
								if(addJoints) {

									new_cmds[new_cmds_cnt++]=(strokeStyle.jointstyle!=JointStyle.ROUND)? GraphicsPathCommand.BUILD_JOINT : GraphicsPathCommand.BUILD_ROUND_JOINT;
									if (dir_delta > 0) {
										new_pnts[new_pnts_cnt++] = right_point_merged_x;
										new_pnts[new_pnts_cnt++] = right_point_merged_y;
										new_pnts[new_pnts_cnt++] = left_point_contour_prev_x;
										new_pnts[new_pnts_cnt++] = left_point_contour_prev_y;
										new_pnts[new_pnts_cnt++] = left_point_contour_x;
										new_pnts[new_pnts_cnt++] = left_point_contour_y;
									}
									else {
										new_pnts[new_pnts_cnt++] = right_point_contour_prev_x;
										new_pnts[new_pnts_cnt++] = right_point_contour_prev_y;
										new_pnts[new_pnts_cnt++] = left_point_merged_x;
										new_pnts[new_pnts_cnt++] = left_point_merged_y;
										new_pnts[new_pnts_cnt++] = right_point_contour_x;
										new_pnts[new_pnts_cnt++] = right_point_contour_y;
									}

									if(strokeStyle.jointstyle==JointStyle.ROUND){

										new_pnts[new_pnts_cnt++] = prev_x - (tmp_point2.x * Math.abs(half_thickness));
										new_pnts[new_pnts_cnt++] = prev_y - (tmp_point2.y * Math.abs(half_thickness));

										if (dir_delta > 0) {
											new_pnts[new_pnts_cnt++] = left_point_contour_prev_x;
											new_pnts[new_pnts_cnt++] = left_point_contour_prev_y;
											new_pnts[new_pnts_cnt++] = left_point_contour_x;
											new_pnts[new_pnts_cnt++] = left_point_contour_y;
										}
										else {
											new_pnts[new_pnts_cnt++] = right_point_contour_prev_x;
											new_pnts[new_pnts_cnt++] = right_point_contour_prev_y;
											new_pnts[new_pnts_cnt++] = right_point_contour_x;
											new_pnts[new_pnts_cnt++] = right_point_contour_y;
										}
									}

								}

							}
						}
						prev_normal_x = tmp_point.x;
						prev_normal_y = tmp_point.y;
						if(add_segment){
							new_cmds[new_cmds_cnt++] = GraphicsPathCommand.LINE_TO;
							new_pnts[new_pnts_cnt++] = right_point_x;
							new_pnts[new_pnts_cnt++] = right_point_y;
							new_pnts[new_pnts_cnt++] = left_point_x;
							new_pnts[new_pnts_cnt++] = left_point_y;
						}
						prev_prev_x=prev_x;
						prev_prev_y=prev_y;
						prev_x = end_x;
						prev_y = end_y;
						if(i==data.length-2){
							new_cmds[new_cmds_cnt++] = GraphicsPathCommand.NO_OP;
							if (!closed) {
								new_pnts[new_pnts_cnt++] = prev_x + (tmp_point.x * half_thickness);
								new_pnts[new_pnts_cnt++] = prev_y + (tmp_point.y * half_thickness);
								new_pnts[new_pnts_cnt++] = prev_x - (tmp_point.x * half_thickness);
								new_pnts[new_pnts_cnt++] = prev_y - (tmp_point.y * half_thickness);
							}
							else{
								new_pnts[new_pnts_cnt++] = new_pnts[0];
								new_pnts[new_pnts_cnt++] = new_pnts[1];
								new_pnts[new_pnts_cnt++] = new_pnts[2];
								new_pnts[new_pnts_cnt++] = new_pnts[3];
							}
						}
					}

				}


				new_cmds_cnt=0;
				new_pnts_cnt=0;
				for (i = 0; i < new_cmds.length; i++) {

					if(new_cmds[i]==GraphicsPathCommand.LINE_TO){
						start_right_x = new_pnts[new_pnts_cnt++];
						start_right_y = new_pnts[new_pnts_cnt++];
						start_left_x = new_pnts[new_pnts_cnt++];
						start_left_y = new_pnts[new_pnts_cnt++];
						end_right_x = new_pnts[new_pnts_cnt];
						end_right_y = new_pnts[new_pnts_cnt+1];
						end_left_x = new_pnts[new_pnts_cnt+2];
						end_left_y = new_pnts[new_pnts_cnt+3];
						//0GraphicsFactoryHelper.drawPoint(start_right.x,start_right.y, final_vert_list, false);
						//GraphicsFactoryHelper.drawPoint(start_left.x,start_left.y, final_vert_list, false);
						//GraphicsFactoryHelper.drawPoint(end_right.x,end_right.y, final_vert_list, false);
						//GraphicsFactoryHelper.drawPoint(end_left_x,end_left_y, final_vert_list, false);
						GraphicsFactoryHelper.addTriangle(start_right_x,  start_right_y,    end_right_x,  end_right_y, start_left_x,  start_left_y, 0, final_vert_list, curves);
						GraphicsFactoryHelper.addTriangle(start_left_x,  start_left_y,  end_right_x,  end_right_y, end_left_x,  end_left_y,  0, final_vert_list, curves);

					}
					else if(new_cmds[i]>=GraphicsPathCommand.BUILD_JOINT) {
						end_right_x = new_pnts[new_pnts_cnt++];
						end_right_y = new_pnts[new_pnts_cnt++];
						start_right_x = new_pnts[new_pnts_cnt++];
						start_right_y = new_pnts[new_pnts_cnt++];
						start_left_x = new_pnts[new_pnts_cnt++];
						start_left_y = new_pnts[new_pnts_cnt++];
						GraphicsFactoryHelper.addTriangle(start_right_x,  start_right_y,  start_left_x,  start_left_y,  end_right_x,  end_right_y, 0, final_vert_list, curves);
						if(new_cmds[i]==GraphicsPathCommand.BUILD_ROUND_JOINT) {
							end_left_x = new_pnts[new_pnts_cnt++];
							end_left_y = new_pnts[new_pnts_cnt++];
							start_right_x = new_pnts[new_pnts_cnt++];
							start_right_y = new_pnts[new_pnts_cnt++];
							start_left_x = new_pnts[new_pnts_cnt++];
							start_left_y = new_pnts[new_pnts_cnt++];
							GraphicsFactoryHelper.tesselateCurve(start_right_x, start_right_y, end_left_x, end_left_y, start_left_x, start_left_y, final_vert_list, 1, true);						
						}
					}
				}
				if (!closed){
					last_dir_vec.x = data[2] - data[0];
					last_dir_vec.y = data[3] - data[1];
					last_dir_vec.normalize();
					//console.log("createCap", data[0], data[1], new_pnts[0], new_pnts[1], new_pnts[2], new_pnts[3], last_dir_vec.x, last_dir_vec.y, strokeStyle.capstyle, -1, half_thickness, final_vert_list, curves, scale);
					GraphicsFactoryHelper.createCap(data[0], data[1], new_pnts[0], new_pnts[1], new_pnts[2], new_pnts[3], last_dir_vec.x, last_dir_vec.y, strokeStyle.capstyle, -1, half_thickness, final_vert_list, curves, scale);

					last_dir_vec.x = data[data.length-2] - data[data.length-4];
					last_dir_vec.y = data[data.length-1] - data[data.length-3];
					last_dir_vec.normalize();
					GraphicsFactoryHelper.createCap(data[data.length-2], data[data.length-1], new_pnts[new_pnts.length-4], new_pnts[new_pnts.length-3], new_pnts[new_pnts.length-2], new_pnts[new_pnts.length-1], last_dir_vec.x, last_dir_vec.y, strokeStyle.capstyle, 1, half_thickness, final_vert_list, curves, scale);

				}

			}

		}
		//targetGraphic.queued_stroke_pathes.length=0;
	}

}