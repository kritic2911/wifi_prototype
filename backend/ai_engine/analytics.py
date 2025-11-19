import seaborn as sns
import matplotlib
matplotlib.use('Agg') # Non-interactive backend
import matplotlib.pyplot as plt
import io
import base64

def generate_heatmap(aps_data):
    # aps_data: list of dicts {x, y, load}
    
    if not aps_data:
        return ""

    # Create a grid
    plt.figure(figsize=(8, 6))
    
    x = [ap['x'] for ap in aps_data]
    y = [ap['y'] for ap in aps_data]
    load = [ap['load'] for ap in aps_data]
    
    # Create a scatter plot with color mapped to load
    # Using a diverging colormap: Green (low) -> Yellow -> Red (high)
    plt.scatter(x, y, c=load, cmap='RdYlGn_r', s=1000, alpha=0.7, edgecolors='black')
    
    # Add labels
    for i, txt in enumerate(load):
        plt.annotate(f"{txt}%", (x[i], y[i]), ha='center', va='center', color='white', fontweight='bold')

    plt.colorbar(label='Load %')
    plt.title('Network Density Heatmap')
    plt.xlabel('X Coordinate (m)')
    plt.ylabel('Y Coordinate (m)')
    plt.grid(True, linestyle='--', alpha=0.3)
    plt.xlim(0, 100)
    plt.ylim(0, 100)
    
    # Save to buffer
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    plt.close()
    buf.seek(0)
    
    # Encode to base64
    img_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    return f"data:image/png;base64,{img_base64}"
