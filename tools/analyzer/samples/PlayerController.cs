public class PlayerController : MonoBehaviour, IDashable
{
    [SerializeField] private DashConfig dashConfig;
    private bool isInvincible;
    private float dashCooldown = 1.2f;

    public bool IsInvincible => isInvincible;

    public void Dash(Vector2 direction)
    {
        isInvincible = true;
        transform.Translate(direction * dashConfig.speed);
    }

    private void ResetInvincibility()
    {
        isInvincible = false;
    }

    void Update()
    {
        if (Input.GetKeyDown(KeyCode.Space))
        {
            Dash(Vector2.right);
        }
    }
}
