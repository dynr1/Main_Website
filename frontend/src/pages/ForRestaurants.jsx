import {Link} from "react-router-dom";


export default function ForRestaurants(){

const points=[
"You're an independent restaurant",
"You want to build real relationships with your guests",
"You've watched guests come once and never come back",
"You want a simple way to fill your quiet nights",
"You care about hospitality"
];


return (

<>

<section className="section-alt">

<div className="container center-block">

<h2>
This is for you if...
</h2>

</div>

</section>



<section style={{paddingTop:"60px"}}>

<div className="container">

<ul className="check-list">

{
points.map((item,index)=>(

<li key={index}>
<span className="icon">
✓
</span>

{item}

</li>

))
}

</ul>


</div>

</section>



<section className="section-dark">

<div className="container center-block">

<h2 style={{color:"#fff"}}>
Book a 15-Minute Chat
</h2>


<Link className="btn" to="/contact">
Book a 15-Minute Chat
</Link>


</div>

</section>


</>

)

}